# E2E: Berlin (navya) campaign sheet sync stores international phones (+49/+968/+356...), no forced +91.
# SAFE: syncs each sheet exactly ONCE with send_to_existing=false (first sync never sends WhatsApp). Deletes sheets after.
import csv
import io
import os
import re
import sys
import pytest
import requests

sys.path.insert(0, "/app/backend")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
CREDS = {"email": "navyaarora@visaxpert.co", "password": "VisaXpert@2024"}
SHEET_URL = "https://docs.google.com/spreadsheets/d/11qQKV39XNNGwQ9IWCw671BdvKQsVXOjEko1EOD6PK6Q/edit"
TABS = {"NON-EU": "1551110032", "EU": "2139819490"}


def _expected_phone(raw):
    s = raw.strip()
    s = re.sub(r"[\u200e\u200f\u202a-\u202e]", "", s)
    if s.startswith("p:"):
        s = s[2:]
    return s


@pytest.fixture(scope="module")
def synced():
    created = []
    results = {}
    try:
        for tab, gid in TABS.items():
            r = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets", params=CREDS, json={
                "spreadsheet_url": SHEET_URL, "gid": gid, "tab_name": tab, "label": f"TEST_{tab}",
                "columns": [{"heading": "Created", "sheet_column": "created_time"},
                            {"heading": "Name", "sheet_column": "full_name"},
                            {"heading": "Phone", "sheet_column": "phone"},
                            {"heading": "Status", "sheet_column": "lead_status"},
                            {"heading": "Looking for", "sheet_column": "platform"},
                            {"heading": "Branch", "sheet_column": ""},
                            {"heading": "Campaign", "sheet_column": "campaign_name"},
                            {"heading": "Priority", "sheet_column": "Priority"}],
                "phone_col": 2, "name_col": 1, "branch_col": 5, "auto_sync_enabled": False,
            }, timeout=30)
            assert r.status_code == 200, r.text
            sid = r.json()["campaign_sheet_id"]
            created.append(sid)
            s = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync", params=CREDS,
                              json={"send_to_existing": False}, timeout=90)
            assert s.status_code == 200, s.text
            results[tab] = (sid, s.json())
        yield results
    finally:
        for sid in ([] if os.environ.get("KEEP_TEST_SHEETS") else created):
            requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}", params=CREDS, timeout=30)


def test_sync_no_whatsapp_queued(synced):
    for tab, (_, res) in synced.items():
        print(tab, res["message"])
        assert res["whatsapp_queued"] == 0
        assert res["imported"] > 0


def test_stored_phones_international(synced):
    import server
    leads = []
    page = 1
    while True:
        r = requests.get(f"{BASE_URL}/api/dashboard/campaign-leads", params={**CREDS, "page": page, "per_page": 200}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["account"] == "berlin"
        leads += d["items"]
        if page * 200 >= d["total"]:
            break
        page += 1
    sids = {sid for sid, _ in synced.values()}
    leads = [x for x in leads if x["campaign_sheet_id"] in sids]
    assert leads
    bad = []
    for x in leads:
        raw = x["values"][2]
        assert x["phone"].startswith("+"), x
        expected = "+" + server._format_phone(raw, "49")
        if x["phone"] != expected:
            bad.append((raw, x["phone"], expected))
        # International numbers must keep their own code exactly
        e = _expected_phone(raw)
        if e.startswith("+"):
            want = "+" + re.sub(r"\D", "", e)
            if want.startswith("+490"):
                want = "+49" + want[4:]
            if x["phone"] != want:
                bad.append((raw, x["phone"], want))
        assert not x["phone"].startswith("+91") or "+91" in raw or "91" in re.sub(r"\D", "", raw)[:2], x
        assert x["whatsapp"] and x["whatsapp"]["status"] in ("skipped", "duplicate")
    prefixes = {}
    for x in leads:
        for cc in ("+49", "+91", "+968", "+356", "+371", "+351", "+92", "+36", "+420"):
            if x["phone"].startswith(cc):
                prefixes[cc] = prefixes.get(cc, 0) + 1
    print("country-code counts:", prefixes, "total leads:", len(leads))
    print("sample:", [(x["values"][2], x["phone"]) for x in leads[:8]])
    assert not bad, bad
    assert prefixes.get("+49", 0) > 30 and prefixes.get("+968") == 1 and prefixes.get("+356", 0) >= 1
