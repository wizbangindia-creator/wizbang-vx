"""Iteration-2 tests: incremental dedupe, auto-sync settings persistence,
and unique sparse index behaviour on `sheet_external_id`.

Run:
    pytest /app/backend/tests/test_sheets_iteration2.py -v \
        --junitxml=/app/test_reports/pytest/iteration2.xml
"""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "visaxpert")

EMAIL = "admin@visaxpert.com"
PASSWORD = "VisaXpert@2024"
AUTH_PARAMS = {"email": EMAIL, "password": PASSWORD}

# Public Class Data sheet
TEST_SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
)


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def cleanup_sheet_leads(mongo_db):
    """Wipe sheet-imported leads + reset settings doc before this module runs."""
    mongo_db.leads.delete_many({"platform": "google_sheets_sync"})
    # Reset settings (preserve doc, clear last_sync / mapping for clean state)
    mongo_db.settings.update_one(
        {"type": "google_sheets_sync"},
        {"$unset": {"last_sync": "", "last_sync_result": ""}},
    )
    yield
    # Teardown: remove TEST_ rows
    mongo_db.leads.delete_many(
        {"sheet_external_id": {"$regex": "^TEST_"}}
    )


# --------------------------------------------------------------------------- #
# 1. Unique sparse index on `sheet_external_id`
# --------------------------------------------------------------------------- #
class TestUniqueIndex:
    def test_index_exists(self, mongo_db):
        indexes = list(mongo_db.leads.list_indexes())
        sheet_idx = [i for i in indexes if "sheet_external_id" in i["key"]]
        assert sheet_idx, f"sheet_external_id index missing. Got: {[i['name'] for i in indexes]}"
        idx = sheet_idx[0]
        assert idx.get("unique") is True, f"index not unique: {idx}"
        assert idx.get("sparse") is True, f"index not sparse: {idx}"

    def test_duplicate_insert_rejected(self, mongo_db):
        """Inserting two leads with the same sheet_external_id must fail on the 2nd."""
        ext_id = "TEST_unique_idx_" + str(int(time.time() * 1000))
        from pymongo.errors import DuplicateKeyError

        mongo_db.leads.insert_one(
            {"lead_id": "TEST_u1", "name": "A", "sheet_external_id": ext_id}
        )
        with pytest.raises(DuplicateKeyError):
            mongo_db.leads.insert_one(
                {"lead_id": "TEST_u2", "name": "B", "sheet_external_id": ext_id}
            )
        # cleanup
        mongo_db.leads.delete_many({"sheet_external_id": ext_id})


# --------------------------------------------------------------------------- #
# 2. Incremental dedupe via /sheets/sync-with-mapping using unique_id mapping
# --------------------------------------------------------------------------- #
class TestIncrementalDedupe:
    @pytest.fixture(scope="class")
    def _clear_sheet_leads(self, mongo_db):
        mongo_db.leads.delete_many({"platform": "google_sheets_sync"})
        yield
        mongo_db.leads.delete_many({"platform": "google_sheets_sync"})

    def _run_sync(self, session):
        body = {
            "sheet_url": TEST_SHEET_URL,
            "column_mapping": {
                "name": "Student Name",
                "city": "Home State",
                "unique_id": "Student Name",  # use student name as stable row id
            },
            "extra_columns": ["Major", "Class Level"],
            "default_source": "google_sheets",
            "save_mapping": True,
        }
        r = session.post(
            f"{BASE_URL}/api/dashboard/sheets/sync-with-mapping",
            params=AUTH_PARAMS,
            json=body,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        return r.json()

    def test_first_sync_imports_rows(self, session, _clear_sheet_leads):
        result = self._run_sync(session)
        assert result["success"] is True
        assert result["imported"] > 0, (
            f"Expected >0 imports on first run, got {result}"
        )

    def test_second_sync_skips_all_rows(self, session):
        result = self._run_sync(session)
        assert result["success"] is True
        assert result["imported"] == 0, (
            f"Expected 0 imports on re-run (dedupe), got imported={result['imported']} "
            f"skipped={result['skipped']}"
        )
        assert result["skipped"] > 0, "Expected rows to be skipped via sheet_external_id"

    def test_leads_have_sheet_external_id(self, mongo_db):
        leads_with_ext = list(
            mongo_db.leads.find(
                {"platform": "google_sheets_sync", "sheet_external_id": {"$exists": True}}
            ).limit(5)
        )
        assert len(leads_with_ext) > 0, (
            "No leads have sheet_external_id set — incremental dedupe won't work"
        )
        for lead in leads_with_ext:
            assert isinstance(lead["sheet_external_id"], str)
            assert lead["sheet_external_id"]  # non-empty


# --------------------------------------------------------------------------- #
# 3. Auto-sync settings persistence
# --------------------------------------------------------------------------- #
class TestAutoSyncSettings:
    def test_get_returns_auto_sync_fields(self, session):
        r = session.get(
            f"{BASE_URL}/api/dashboard/sync-settings",
            params=AUTH_PARAMS,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "auto_sync_enabled" in data
        assert "sync_interval_minutes" in data
        assert isinstance(data["auto_sync_enabled"], bool)
        assert isinstance(data["sync_interval_minutes"], int)

    def test_post_persists_auto_sync(self, session):
        r = session.post(
            f"{BASE_URL}/api/dashboard/sync-settings",
            params={
                **AUTH_PARAMS,
                "auto_sync_enabled": "true",
                "sync_interval_minutes": 7,
                "google_sheets_url": TEST_SHEET_URL,
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

        # Verify via GET
        r2 = session.get(
            f"{BASE_URL}/api/dashboard/sync-settings",
            params=AUTH_PARAMS,
            timeout=15,
        )
        data = r2.json()
        assert data["auto_sync_enabled"] is True
        assert data["sync_interval_minutes"] == 7

    def test_save_does_not_wipe_mapping(self, session, mongo_db):
        """POSTing /sync-settings should NOT clear the previously-saved column_mapping."""
        settings = mongo_db.settings.find_one({"type": "google_sheets_sync"})
        assert settings is not None
        assert settings.get("column_mapping"), (
            "column_mapping was wiped after saving auto-sync settings"
        )


# --------------------------------------------------------------------------- #
# 4. Auto-sync background loop runs and updates last_sync
# --------------------------------------------------------------------------- #
class TestAutoSyncLoop:
    """Verify the background _maybe_run_auto_sheet_sync fires within ~70s."""

    def test_last_sync_advances(self, session, mongo_db):
        # Make sure mapping is saved (uses Student Name as unique id)
        save_body = {
            "sheet_url": TEST_SHEET_URL,
            "column_mapping": {
                "name": "Student Name",
                "city": "Home State",
                "unique_id": "Student Name",
            },
            "extra_columns": ["Major"],
            "default_source": "google_sheets",
            "save_mapping": True,
        }
        r = session.post(
            f"{BASE_URL}/api/dashboard/sheets/sync-with-mapping",
            params=AUTH_PARAMS,
            json=save_body,
            timeout=60,
        )
        assert r.status_code == 200, r.text

        # Enable auto-sync at 1-minute interval
        r2 = session.post(
            f"{BASE_URL}/api/dashboard/sync-settings",
            params={
                **AUTH_PARAMS,
                "auto_sync_enabled": "true",
                "sync_interval_minutes": 1,
                "google_sheets_url": TEST_SHEET_URL,
            },
            timeout=15,
        )
        assert r2.status_code == 200

        # Force last_sync to be stale (older than 1 min) so the loop fires next tick
        mongo_db.settings.update_one(
            {"type": "google_sheets_sync"},
            {"$set": {"last_sync": "2020-01-01T00:00:00+00:00"}},
        )

        initial = mongo_db.settings.find_one({"type": "google_sheets_sync"}).get(
            "last_sync"
        )
        assert initial == "2020-01-01T00:00:00+00:00"

        # Background loop fires every 60s. Poll for up to 80s.
        deadline = time.time() + 80
        updated = None
        while time.time() < deadline:
            time.sleep(5)
            doc = mongo_db.settings.find_one({"type": "google_sheets_sync"})
            if doc and doc.get("last_sync") and doc["last_sync"] != initial:
                updated = doc["last_sync"]
                break

        assert updated is not None, (
            "Auto-sync loop did not update last_sync within 80s "
            "(initial=2020-01-01). Check scheduler / _maybe_run_auto_sheet_sync."
        )

    def test_disable_auto_sync_cleanup(self, session):
        """Disable auto-sync at end of test class so other tests aren't affected."""
        r = session.post(
            f"{BASE_URL}/api/dashboard/sync-settings",
            params={
                **AUTH_PARAMS,
                "auto_sync_enabled": "false",
                "sync_interval_minutes": 30,
                "google_sheets_url": TEST_SHEET_URL,
            },
            timeout=15,
        )
        assert r.status_code == 200
