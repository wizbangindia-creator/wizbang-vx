"""Backend tests for /api/uc-bookings/* and /api/dashboard/uc-bookings/* endpoints.

Today is 2026-06-10 IST in this preview. Default advance_days=30 so testable
dates are between today and 2026-07-10. We use 2026-07-08 (Wed) as the primary
test date and 2026-07-05 (Sunday) for non-working-day checks.
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vx-social.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@visaxpert.com"
ADMIN_PASSWORD = "VisaXpert@2024"
ADMIN_QS = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

WORKING_DATE = "2026-07-08"     # Wednesday
SUNDAY_DATE = "2026-07-05"      # Sunday
ALT_WORKING_DATE = "2026-07-09" # Thursday for toggle/disabled tests

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "visaxpert")


@pytest.fixture(scope="module")
def mongo_db():
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture(scope="module")
def cleanup(mongo_db):
    """Pre/post-cleanup of any TEST_ bookings + slot overrides in our test dates."""
    db = mongo_db
    # pre cleanup
    db.uc_bookings.delete_many({"slot_date": {"$in": [WORKING_DATE, ALT_WORKING_DATE]}})
    db.uc_slot_overrides.delete_many({"date": {"$in": [WORKING_DATE, ALT_WORKING_DATE]}})
    db.leads.delete_many({"email": {"$regex": "^qa\\+"}})
    yield
    db.uc_bookings.delete_many({"slot_date": {"$in": [WORKING_DATE, ALT_WORKING_DATE]}})
    db.uc_slot_overrides.delete_many({"date": {"$in": [WORKING_DATE, ALT_WORKING_DATE]}})
    db.leads.delete_many({"email": {"$regex": "^qa\\+"}})


# ---------- Public endpoints ----------

class TestDays:
    def test_days_shape_and_filters(self):
        r = requests.get(f"{BASE_URL}/api/uc-bookings/days", params={"month": "2026-07"})
        assert r.status_code == 200
        data = r.json()
        assert set(["month", "days", "advance_days", "today"]).issubset(data.keys())
        assert data["month"] == "2026-07"
        assert isinstance(data["days"], list)
        # No Sundays (weekday 6)
        import datetime as _dt
        for d in data["days"]:
            wd = _dt.date.fromisoformat(d).weekday()
            assert wd in [0, 1, 2, 3, 4, 5], f"non-working day returned: {d}"
        # No past dates
        today = data["today"]
        for d in data["days"]:
            assert d >= today, f"past date returned: {d}"

    def test_days_invalid_month(self):
        r = requests.get(f"{BASE_URL}/api/uc-bookings/days", params={"month": "bad"})
        assert r.status_code == 400


class TestAvailability:
    def test_working_day_has_18_slots(self):
        r = requests.get(f"{BASE_URL}/api/uc-bookings/availability", params={"date": WORKING_DATE})
        assert r.status_code == 200
        data = r.json()
        assert data["working_day"] is True
        # default 10:00-19:00 with 30 min → 18 slots
        assert len(data["slots"]) == 18
        statuses = {s["status"] for s in data["slots"]}
        assert "available" in statuses
        # First slot 10:00
        assert data["slots"][0]["time"] == "10:00"
        assert data["slots"][-1]["time"] == "18:30"

    def test_sunday_is_non_working(self):
        r = requests.get(f"{BASE_URL}/api/uc-bookings/availability", params={"date": SUNDAY_DATE})
        assert r.status_code == 200
        data = r.json()
        assert data["working_day"] is False
        assert data["slots"] == []

    def test_invalid_date(self):
        r = requests.get(f"{BASE_URL}/api/uc-bookings/availability", params={"date": "bad"})
        assert r.status_code == 400


class TestCreateBooking:
    booking_id = None

    def test_create_success(self, cleanup):
        payload = {
            "name": "Test Student",
            "email": f"qa+{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+919876543210",
            "slot_date": WORKING_DATE,
            "slot_time": "14:00",
        }
        r = requests.post(f"{BASE_URL}/api/uc-bookings/create", json=payload)
        assert r.status_code in (200, 201), r.text
        data = r.json()
        assert data["success"] is True
        assert data["slot_date"] == WORKING_DATE
        assert data["slot_time"] == "14:00"
        assert "booking_id" in data
        TestCreateBooking.booking_id = data["booking_id"]

    def test_duplicate_slot_returns_409(self):
        payload = {
            "name": "Other Student",
            "email": f"qa+{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+919876543211",
            "slot_date": WORKING_DATE,
            "slot_time": "14:00",
        }
        r = requests.post(f"{BASE_URL}/api/uc-bookings/create", json=payload)
        assert r.status_code == 409, r.text
        assert "slot just got booked" in r.text.lower() or "booked" in r.text.lower()

    def test_invalid_slot_time_400(self):
        payload = {
            "name": "Bad Slot",
            "email": f"qa+{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+919876543212",
            "slot_date": WORKING_DATE,
            "slot_time": "13:17",
        }
        r = requests.post(f"{BASE_URL}/api/uc-bookings/create", json=payload)
        assert r.status_code == 400

    def test_availability_shows_booked(self):
        r = requests.get(f"{BASE_URL}/api/uc-bookings/availability", params={"date": WORKING_DATE})
        data = r.json()
        slot = next(s for s in data["slots"] if s["time"] == "14:00")
        assert slot["status"] == "booked"

    def test_lead_mirrored_to_leads(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", params=ADMIN_QS)
        assert r.status_code == 200
        data = r.json()
        # Verify university_change count exists (>= 1 from our booking)
        # Source distribution may be a dict or list-of-objects depending on impl
        # Be flexible:
        text = str(data).lower()
        assert "university_change" in text

    def test_scheduled_emails_inserted(self, mongo_db):
        if TestCreateBooking.booking_id is None:
            pytest.skip("no booking_id from create")
        rows = list(mongo_db.scheduled_emails.find(
            {"booking_id": TestCreateBooking.booking_id, "status": "pending"}
        ))
        kinds = sorted([r["kind"] for r in rows])
        assert kinds == ["uc_booking_followup", "uc_booking_reminder_1h", "uc_booking_reminder_24h"]


class TestAdminAuth:
    def test_wrong_password_401(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/uc-bookings/settings",
                         params={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/uc-bookings/list",
                         params={"email": "x@x.com", "password": "y"})
        assert r.status_code == 401


class TestAdminSettings:
    original_slot_minutes = None

    def test_get_settings(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/uc-bookings/settings", params=ADMIN_QS)
        assert r.status_code == 200
        data = r.json()
        assert "slot_minutes" in data and "start_time" in data
        TestAdminSettings.original_slot_minutes = data["slot_minutes"]

    def test_update_slot_minutes_to_45(self):
        r = requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/settings",
                          params=ADMIN_QS, json={"slot_minutes": 45})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["settings"]["slot_minutes"] == 45
        # restore
        requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/settings",
                      params=ADMIN_QS, json={"slot_minutes": TestAdminSettings.original_slot_minutes or 30})

    def test_invalid_end_before_start(self):
        r = requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/settings",
                          params=ADMIN_QS,
                          json={"start_time": "19:00", "end_time": "10:00"})
        assert r.status_code == 400

    def test_invalid_slot_minutes_too_high(self):
        r = requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/settings",
                          params=ADMIN_QS, json={"slot_minutes": 300})
        assert r.status_code == 400


class TestAdminToggleSlot:
    def test_toggle_disable_then_enable(self):
        # disable 11:00 on ALT_WORKING_DATE
        r = requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/slots/toggle",
                          params=ADMIN_QS,
                          json={"date": ALT_WORKING_DATE, "time": "11:00", "disabled": True})
        assert r.status_code == 200, r.text
        # public availability reflects it
        r = requests.get(f"{BASE_URL}/api/uc-bookings/availability", params={"date": ALT_WORKING_DATE})
        slot = next(s for s in r.json()["slots"] if s["time"] == "11:00")
        assert slot["status"] == "disabled"

        # booking disabled slot → 409
        payload = {
            "name": "Disabled Test",
            "email": f"qa+{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+919876543220",
            "slot_date": ALT_WORKING_DATE,
            "slot_time": "11:00",
        }
        r = requests.post(f"{BASE_URL}/api/uc-bookings/create", json=payload)
        assert r.status_code == 409

        # re-enable
        r = requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/slots/toggle",
                          params=ADMIN_QS,
                          json={"date": ALT_WORKING_DATE, "time": "11:00", "disabled": False})
        assert r.status_code == 200
        r = requests.get(f"{BASE_URL}/api/uc-bookings/availability", params={"date": ALT_WORKING_DATE})
        slot = next(s for s in r.json()["slots"] if s["time"] == "11:00")
        assert slot["status"] == "available"


class TestAdminListAndCancel:
    cancel_booking_id = None

    def test_list_bookings(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/uc-bookings/list", params=ADMIN_QS)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and isinstance(data["items"], list)
        # the created booking should be present
        found = [b for b in data["items"] if b.get("slot_date") == WORKING_DATE and b.get("slot_time") == "14:00"]
        assert len(found) >= 1
        # Verify ISO string dates
        bk = found[0]
        assert isinstance(bk.get("slot_dt_utc"), str)
        assert isinstance(bk.get("created_at"), str)
        TestAdminListAndCancel.cancel_booking_id = bk["booking_id"]

    def test_cancel_booking_and_slot_freed(self):
        bid = TestAdminListAndCancel.cancel_booking_id
        assert bid is not None
        r = requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/cancel/{bid}", params=ADMIN_QS)
        assert r.status_code == 200
        # Slot now available again
        r = requests.get(f"{BASE_URL}/api/uc-bookings/availability", params={"date": WORKING_DATE})
        slot = next(s for s in r.json()["slots"] if s["time"] == "14:00")
        assert slot["status"] in ("available", "past")

    def test_cancel_nonexistent_returns_404(self):
        r = requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/cancel/does-not-exist",
                          params=ADMIN_QS)
        assert r.status_code == 404

    def test_cancel_already_cancelled_returns_404(self):
        bid = TestAdminListAndCancel.cancel_booking_id
        r = requests.post(f"{BASE_URL}/api/dashboard/uc-bookings/cancel/{bid}", params=ADMIN_QS)
        assert r.status_code == 404

    def test_status_filter_cancelled(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/uc-bookings/list",
                         params={**ADMIN_QS, "status": "cancelled"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert all(b.get("status") == "cancelled" for b in items)
