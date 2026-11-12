"""Tests for the flexible Google Sheets mapping feature.

Covers:
- POST /api/dashboard/sheets/preview
- GET  /api/dashboard/sync-settings (column_mapping/extra_columns/default_source)
- POST /api/dashboard/sheets/sync-with-mapping (import + persist mapping)
- POST /api/dashboard/sync-google-sheets (uses saved mapping transparently)
- Auth checks (401 on bad credentials)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

EMAIL = "admin@visaxpert.com"
PASSWORD = "VisaXpert@2024"

# Google's reliably-public sample sheet ("Class Data") — headers:
# Student Name, Gender, Class Level, Home State, Major, Extracurricular Activity
TEST_SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
)

AUTH_PARAMS = {"email": EMAIL, "password": PASSWORD}
BAD_AUTH_PARAMS = {"email": EMAIL, "password": "wrong-password"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/dashboard/sheets/preview ----------
class TestPreview:
    def test_preview_returns_headers_samples(self, session):
        r = session.post(
            f"{BASE_URL}/api/dashboard/sheets/preview",
            params={**AUTH_PARAMS, "sheet_url": TEST_SHEET_URL, "sample_size": 5},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "headers" in data and isinstance(data["headers"], list)
        assert "samples" in data and isinstance(data["samples"], list)
        assert "total_rows" in data and isinstance(data["total_rows"], int)
        # Class Data sheet should have several columns and rows
        assert len(data["headers"]) >= 3, f"Headers too few: {data['headers']}"
        assert data["total_rows"] > 0
        assert len(data["samples"]) > 0
        # samples are list of dicts keyed by header
        sample = data["samples"][0]
        assert isinstance(sample, dict)
        # at least one header key should appear in the sample row
        assert any(h in sample for h in data["headers"])

    def test_preview_requires_auth(self, session):
        r = session.post(
            f"{BASE_URL}/api/dashboard/sheets/preview",
            params={**BAD_AUTH_PARAMS, "sheet_url": TEST_SHEET_URL},
            timeout=30,
        )
        assert r.status_code == 401, r.text


# ---------- /api/dashboard/sync-settings ----------
class TestSyncSettingsShape:
    def test_get_sync_settings_has_new_fields(self, session):
        r = session.get(
            f"{BASE_URL}/api/dashboard/sync-settings", params=AUTH_PARAMS, timeout=15
        )
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("column_mapping", "extra_columns", "default_source"):
            assert key in data, f"missing {key} in sync-settings: {data}"
        assert isinstance(data["column_mapping"], dict)
        assert isinstance(data["extra_columns"], list)
        assert isinstance(data["default_source"], str)
        assert data["default_source"]  # non-empty


# ---------- /api/dashboard/sheets/sync-with-mapping ----------
class TestSyncWithMapping:
    @pytest.fixture(scope="class")
    def import_result(self, session):
        body = {
            "sheet_url": TEST_SHEET_URL,
            "column_mapping": {
                "name": "Student Name",
                "city": "Home State",
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

    def test_import_success_and_count(self, import_result):
        assert import_result.get("success") is True
        assert isinstance(import_result.get("imported"), int)
        assert isinstance(import_result.get("skipped"), int)
        # imported may be 0 on a re-run because of dedupe. To be robust, assert
        # that imported+skipped > 0 (there ARE rows in the sheet).
        assert (import_result["imported"] + import_result["skipped"]) > 0

    def test_mapping_persisted(self, session, import_result):
        r = session.get(
            f"{BASE_URL}/api/dashboard/sync-settings", params=AUTH_PARAMS, timeout=15
        )
        assert r.status_code == 200
        data = r.json()
        assert data["column_mapping"].get("name") == "Student Name"
        assert data["column_mapping"].get("city") == "Home State"
        assert "Major" in data["extra_columns"]
        assert "Class Level" in data["extra_columns"]
        assert data.get("google_sheets_url") == TEST_SHEET_URL or data.get(
            "google_sheets_url", ""
        ).startswith("https://docs.google.com")

    def test_leads_appear_in_dashboard(self, session, import_result):
        # only run lead check if at least one lead was newly imported in this run
        # otherwise we still verify the endpoint works
        r = session.get(
            f"{BASE_URL}/api/dashboard/leads",
            params={**AUTH_PARAMS, "limit": 50},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        leads = r.json()
        # response can be a list or a wrapper
        if isinstance(leads, dict):
            leads = leads.get("leads") or leads.get("data") or []
        assert isinstance(leads, list)
        # If we imported new leads, at least one should be from google_sheets_sync
        if import_result["imported"] > 0:
            assert any(
                (l.get("platform") == "google_sheets_sync")
                or (l.get("source") == "google_sheets")
                for l in leads
            ), f"No google_sheets leads visible. Sample: {leads[:2]}"

    def test_sync_with_mapping_requires_auth(self, session):
        body = {
            "sheet_url": TEST_SHEET_URL,
            "column_mapping": {"name": "Student Name"},
            "extra_columns": [],
        }
        r = session.post(
            f"{BASE_URL}/api/dashboard/sheets/sync-with-mapping",
            params=BAD_AUTH_PARAMS,
            json=body,
            timeout=30,
        )
        assert r.status_code == 401, r.text


# ---------- /api/dashboard/sync-google-sheets uses saved mapping ----------
class TestSyncUsesSavedMapping:
    def test_sync_google_sheets_uses_saved_mapping(self, session):
        # Ensure mapping is saved (re-save just in case)
        save_body = {
            "sheet_url": TEST_SHEET_URL,
            "column_mapping": {"name": "Student Name", "city": "Home State"},
            "extra_columns": ["Major"],
            "default_source": "google_sheets",
            "save_mapping": True,
        }
        r0 = session.post(
            f"{BASE_URL}/api/dashboard/sheets/sync-with-mapping",
            params=AUTH_PARAMS,
            json=save_body,
            timeout=60,
        )
        assert r0.status_code == 200, r0.text

        # Now call sync-google-sheets WITHOUT passing mapping or sheet_url
        r = session.post(
            f"{BASE_URL}/api/dashboard/sync-google-sheets",
            params=AUTH_PARAMS,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        # Should have imported / skipped counters because it delegated to mapping
        assert "imported" in data
        assert "skipped" in data
