# Multi-tab Google Sheet connections for Campaign Leads (India + Berlin accounts)
# SAFETY: never sends send_to_existing=True; PUT keeps identical column mapping (label-only change).
import os
import urllib.parse
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api/dashboard"
SHEET = "https://docs.google.com/spreadsheets/d/11qQKV39XNNGwQ9IWCw671BdvKQsVXOjEko1EOD6PK6Q/edit"
INDIA = {"email": "admin@visaxpert.com", "password": "VisaXpert@2024"}
BERLIN = {"email": "navyaarora@visaxpert.co", "password": "VisaXpert@2024"}
CREATED = []  # (creds, id)


def headers_for(creds, gid):
    url = f"{SHEET}#gid={gid}"
    r = requests.post(f"{API}/sheets/preview", params={**creds, "sheet_url": url, "sample_size": 1}, timeout=60)
    assert r.status_code == 200, r.text
    return r.json()["headers"]


def payload(gid, name, hdrs, label=None):
    pick = lambda *c: next((h for h in hdrs if h in c), "")
    cols = [("Date", pick("created_time")), ("Name", pick("full_name")),
            ("Phone", pick("phone_number", "phone")), ("Email", pick("email")),
            ("City", pick("city")), ("Preferred Branch", pick("which_branch_would_you_prefer_for_your_online_counselling_session?")),
            ("Country", pick("country", "which_country_are_you_planning_to_study_in?")), ("Campaign", pick("campaign_name"))]
    return {"spreadsheet_url": SHEET, "gid": gid, "tab_name": name, "label": label or name,
            "columns": [{"heading": h, "sheet_column": c} for h, c in cols],
            "phone_col": 2, "name_col": 1, "branch_col": 5, "online_branch_col": -1,
            "auto_sync_enabled": False, "sync_interval_minutes": 15}


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    for creds, sid in CREATED:
        requests.delete(f"{API}/campaign-sheets/{sid}", params=creds, timeout=30)


class TestTabs:
    def test_list_tabs(self):
        r = requests.get(f"{API}/campaign-sheet/tabs", params={**INDIA, "sheet_url": SHEET}, timeout=60)
        assert r.status_code == 200
        gids = {t["gid"]: t["name"] for t in r.json()["tabs"]}
        assert len(gids) == 5
        assert gids["99742259"] == "VisaXpert_Centralized_StudyAbroad_LeadForm-Final"
        assert gids["2139819490"] == "EU" and gids["1551110032"] == "NON-EU"

    def test_invalid_url(self):
        r = requests.get(f"{API}/campaign-sheet/tabs", params={**INDIA, "sheet_url": "https://example.com/foo"}, timeout=30)
        assert r.status_code == 400
        assert "valid Google Sheets" in r.json()["detail"]

    def test_private_sheet(self):
        r = requests.get(f"{API}/campaign-sheet/tabs", params={**INDIA, "sheet_url": "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefg/edit"}, timeout=60)
        assert r.status_code == 400
        assert "Anyone with the link" in r.json()["detail"]

    def test_bad_auth(self):
        r = requests.get(f"{API}/campaign-sheets", params={"email": "admin@visaxpert.com", "password": "wrong"}, timeout=30)
        assert r.status_code in (401, 403)


class TestCrudSync:
    state = {}

    def test_create_india_sheet(self):
        gid, name = "1798667875", "VisaXpert_Pathankot_StudyAbroad_LeadForm-Final-copy"
        body = payload(gid, name, headers_for(INDIA, gid), label="TEST_Pathankot copy")
        r = requests.post(f"{API}/campaign-sheets", params=INDIA, json=body, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["gid"] == gid and d["label"] == "TEST_Pathankot copy" and d["last_sync"] is None
        CREATED.append((INDIA, d["campaign_sheet_id"]))
        self.state["id"] = d["campaign_sheet_id"]
        self.state["body"] = body
        lst = requests.get(f"{API}/campaign-sheets", params=INDIA, timeout=30).json()["sheets"]
        assert any(s["campaign_sheet_id"] == d["campaign_sheet_id"] for s in lst)

    def test_duplicate_409(self):
        r = requests.post(f"{API}/campaign-sheets", params=INDIA, json=self.state["body"], timeout=30)
        assert r.status_code == 409

    def test_first_sync_skips_whatsapp(self):
        r = requests.post(f"{API}/campaign-sheets/{self.state['id']}/sync", params=INDIA, json={"send_to_existing": False}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["whatsapp_queued"] == 0
        self.state["imported"] = d["imported"]
        leads = requests.get(f"{API}/campaign-leads", params={**INDIA, "sheet_id": self.state["id"], "per_page": 200}, timeout=30).json()
        assert leads["total"] == d["imported"]
        assert all(i["whatsapp"]["status"] == "skipped" for i in leads["items"])
        assert all(i["campaign_sheet_id"] == self.state["id"] for i in leads["items"])
        assert leads["headings"][2] == "Phone"

    def test_second_sync_no_duplicates(self):
        r = requests.post(f"{API}/campaign-sheets/{self.state['id']}/sync", params=INDIA, json={"send_to_existing": False}, timeout=120)
        assert r.status_code == 200
        assert r.json()["imported"] == 0

    def test_update_label(self):
        body = {**self.state["body"], "label": "TEST_Renamed"}
        r = requests.put(f"{API}/campaign-sheets/{self.state['id']}", params=INDIA, json=body, timeout=30)
        assert r.status_code == 200 and r.json()["label"] == "TEST_Renamed"
        assert r.json()["last_sync"] is not None

    def test_validation_422(self):
        body = {**self.state["body"], "columns": self.state["body"]["columns"][:3]}
        r = requests.put(f"{API}/campaign-sheets/{self.state['id']}", params=INDIA, json=body, timeout=30)
        assert r.status_code == 422

    def test_sync_all(self):
        r = requests.post(f"{API}/campaign-sheets/sync-all", params=INDIA, timeout=180)
        assert r.status_code == 200 and "TEST_Renamed" in r.json()["message"]

    def test_berlin_isolated(self):
        lst = requests.get(f"{API}/campaign-sheets", params=BERLIN, timeout=30).json()["sheets"]
        assert all(s["campaign_sheet_id"] != self.state["id"] for s in lst)
        r = requests.post(f"{API}/campaign-sheets/{self.state['id']}/sync", params=BERLIN, json={}, timeout=30)
        assert r.status_code == 404
        r = requests.delete(f"{API}/campaign-sheets/{self.state['id']}", params=BERLIN, timeout=30)
        assert r.status_code == 404
        leads = requests.get(f"{API}/campaign-leads", params={**BERLIN, "sheet_id": self.state["id"]}, timeout=30).json()
        assert leads["total"] == 0 and leads["account"] == "berlin"

    def test_berlin_can_connect_same_tab(self):
        gid = "2139819490"
        body = payload(gid, "EU", headers_for(BERLIN, gid), label="TEST_Berlin EU")
        r = requests.post(f"{API}/campaign-sheets", params=BERLIN, json=body, timeout=30)
        assert r.status_code == 200, r.text
        CREATED.append((BERLIN, r.json()["campaign_sheet_id"]))
        india = requests.get(f"{API}/campaign-sheets", params=INDIA, timeout=30).json()["sheets"]
        assert all(s["campaign_sheet_id"] != r.json()["campaign_sheet_id"] for s in india)

    def test_delete(self):
        r = requests.delete(f"{API}/campaign-sheets/{self.state['id']}", params=INDIA, timeout=30)
        assert r.status_code == 200
        r = requests.post(f"{API}/campaign-sheets/{self.state['id']}/sync", params=INDIA, json={}, timeout=30)
        assert r.status_code == 404
