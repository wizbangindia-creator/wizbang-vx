# Smoke tests for freshly cloned VisaXpert app: health, lead webhook, enquiry, dashboard auth & leads
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@visaxpert.com", "password": "VisaXpert@2024"}


@pytest.fixture(scope="module")
def s():
    x = requests.Session()
    x.headers.update({"Content-Type": "application/json"})
    return x


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids
    for lid in ids:
        try:
            requests.delete(f"{BASE_URL}/api/dashboard/leads/{lid}", params=ADMIN, timeout=15)
        except Exception:
            pass


# Health
def test_root(s):
    r = s.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["message"] == "VisaXpert API" and d["status"] == "running"


def test_health(s):
    r = s.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    assert r.json()["database"] == "connected"


# Lead webhook (homepage form + Berlin UC form)
def test_webhook_lead_website(s, created_ids):
    tag = uuid.uuid4().hex[:6]
    r = s.post(f"{BASE_URL}/api/webhook/lead", json={
        "name": f"TEST_Home_{tag}", "email": f"test_{tag}@example.com",
        "phone": "+919999900001", "city": "Delhi", "country": "Germany",
        "source": "website"}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["success"] is True and isinstance(d["lead_id"], str)
    created_ids.append(d["lead_id"])
    # verify in dashboard
    lr = s.get(f"{BASE_URL}/api/dashboard/leads", params={**ADMIN, "search": f"TEST_Home_{tag}"}, timeout=15)
    assert lr.status_code == 200
    assert any(l["id"] == d["lead_id"] for l in lr.json()["leads"])


def test_webhook_lead_university_change(s, created_ids):
    tag = uuid.uuid4().hex[:6]
    r = s.post(f"{BASE_URL}/api/webhook/lead", json={
        "name": f"TEST_UC_{tag}", "email": f"uc_{tag}@example.com",
        "phone": "+4915112345678", "city": "Berlin", "source": "university_change",
        "consultation_mode": "online", "current_university": "IU", "transfer_type": "bachelor"}, timeout=30)
    assert r.status_code == 200, r.text
    lid = r.json()["lead_id"]
    created_ids.append(lid)
    lr = s.get(f"{BASE_URL}/api/dashboard/leads", params={**ADMIN, "search": f"TEST_UC_{tag}"}, timeout=15)
    leads = lr.json()["leads"]
    assert len(leads) == 1 and leads[0]["source"] == "university_change"


def test_webhook_lead_ielts_and_gf(s, created_ids):
    for src in ("ielts_celebration", "germany_fair", "media_design_webinar"):
        r = s.post(f"{BASE_URL}/api/webhook/lead", json={
            "name": f"TEST_{src}", "email": "x@example.com", "phone": "+919999900002",
            "source": src, "preferred_city": "Delhi"}, timeout=30)
        assert r.status_code == 200, f"{src}: {r.text}"
        created_ids.append(r.json()["lead_id"])


def test_enquiry_online(s, created_ids):
    r = s.post(f"{BASE_URL}/api/enquiry", json={
        "name": "TEST_Enq", "email": "enq@example.com", "phone": "+919999900003",
        "country_of_interest": "Canada", "counselling_mode": "online"}, timeout=30)
    assert r.status_code == 200, r.text
    created_ids.append(r.json()["id"])


# Dashboard auth
def test_login_ok(s):
    r = s.post(f"{BASE_URL}/api/dashboard/login", json=ADMIN, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["success"] and d["token"] and d["user"]["access"] == "all"


def test_login_bad(s):
    r = s.post(f"{BASE_URL}/api/dashboard/login", json={"email": ADMIN["email"], "password": "bad"}, timeout=15)
    assert r.status_code == 401


def test_stats(s):
    r = s.get(f"{BASE_URL}/api/dashboard/stats", params=ADMIN, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json()["total_leads"], int)


def test_public_endpoints(s):
    for ep in ("reviews", "partner-logos", "success-stories", "page-logos", "uc-appointment-toggle"):
        r = s.get(f"{BASE_URL}/api/{ep}", timeout=15)
        assert r.status_code == 200, f"{ep}: {r.status_code} {r.text[:200]}"
