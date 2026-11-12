# Iteration 14: multi-tab campaign sheet connect (India + Berlin) and AiSensy "Invalid Number" error rewrite.
# SAFE: never syncs (no imports, no WhatsApp). _send_whatsapp_api is monkeypatched in the unit test.
import asyncio
import os
import sys

import pytest
import requests

sys.path.insert(0, "/app/backend")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
SHEET_URL = "https://docs.google.com/spreadsheets/d/11qQKV39XNNGwQ9IWCw671BdvKQsVXOjEko1EOD6PK6Q/edit"
INDIA = {"email": "admin@visaxpert.com", "password": "VisaXpert@2024"}
BERLIN = {"email": "navyaarora@visaxpert.co", "password": "VisaXpert@2024"}
COLS = [{"heading": h, "sheet_column": ""} for h in ["Date", "Name", "Phone", "Email", "City", "Branch", "Country", "Campaign"]]
COLS[1]["sheet_column"] = "full_name"
COLS[2]["sheet_column"] = "phone"


# --- Tabs endpoint ---
def test_tabs_returns_tabs_and_title():
    r = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheet/tabs", params={**INDIA, "sheet_url": SHEET_URL}, timeout=40)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["title"] == "VisaXpert Campaign Leads"
    assert isinstance(d["tabs"], list) and len(d["tabs"]) >= 2
    assert all("gid" in t and "name" in t for t in d["tabs"])
    print(d)


def test_tabs_invalid_url():
    r = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheet/tabs", params={**INDIA, "sheet_url": "https://example.com/x"}, timeout=20)
    assert r.status_code == 400


def test_tabs_bad_auth():
    r = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheet/tabs", params={"email": INDIA["email"], "password": "nope", "sheet_url": SHEET_URL}, timeout=20)
    assert r.status_code in (401, 403)


# --- Multi-tab create (no sync), title persistence, 409 dupe, account independence ---
@pytest.mark.parametrize("creds,other", [(INDIA, BERLIN), (BERLIN, INDIA)])
def test_multi_tab_connect_account_scoped(creds, other):
    tabs = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheet/tabs", params={**creds, "sheet_url": SHEET_URL}, timeout=40).json()["tabs"][:2]
    created = []
    try:
        for t in tabs:
            r = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets", params=creds, json={
                "spreadsheet_url": SHEET_URL, "spreadsheet_title": "VisaXpert Campaign Leads", "gid": t["gid"],
                "tab_name": t["name"], "label": f"TEST_{t['name']}", "columns": COLS, "auto_sync_enabled": False}, timeout=20)
            assert r.status_code == 200, r.text
            assert r.json()["spreadsheet_title"] == "VisaXpert Campaign Leads"
            created.append(r.json()["campaign_sheet_id"])
        # duplicate tab -> 409
        dup = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets", params=creds, json={
            "spreadsheet_url": SHEET_URL, "gid": tabs[0]["gid"], "tab_name": tabs[0]["name"], "columns": COLS}, timeout=20)
        assert dup.status_code == 409
        lst = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets", params=creds, timeout=20).json()["sheets"]
        mine = [s for s in lst if s["campaign_sheet_id"] in created]
        assert len(mine) == 2 and all(s["spreadsheet_title"] == "VisaXpert Campaign Leads" for s in mine)
        assert all(s["last_sync"] is None for s in mine)
        # other account must not see these
        olst = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets", params=other, timeout=20).json()["sheets"]
        assert not any(s["campaign_sheet_id"] in created for s in olst)
        # other account cannot delete them
        assert requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{created[0]}", params=other, timeout=20).status_code == 404
        # edit: single tab change + label
        upd = requests.put(f"{BASE_URL}/api/dashboard/campaign-sheets/{created[0]}", params=creds, json={
            "spreadsheet_url": SHEET_URL, "spreadsheet_title": "VisaXpert Campaign Leads", "gid": tabs[0]["gid"],
            "tab_name": tabs[0]["name"], "label": "TEST_renamed", "columns": COLS}, timeout=20)
        assert upd.status_code == 200 and upd.json()["label"] == "TEST_renamed"
    finally:
        for sid in created:
            d = requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}", params=creds, timeout=20)
            assert d.status_code == 200
    lst = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets", params=creds, timeout=20).json()["sheets"]
    assert not any(s["campaign_sheet_id"] in created for s in lst)


# --- Unit: send_routed_whatsapp Invalid Number rewrite + sent_to (monkeypatched, no network) ---
@pytest.mark.parametrize("route,phone,expected_to", [("berlin", "+4917612345678", "+4917612345678"),
                                                     ("berlin", "+96891234567", "+96891234567"),
                                                     ("website", "9876543210", "+919876543210")])
def test_invalid_number_rewrite(route, phone, expected_to):
    import server
    from motor.motor_asyncio import AsyncIOMotorClient

    async def run():
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL") or "mongodb://localhost:27017")
        orig_db, orig_send = server.db, server._send_whatsapp_api
        server.db = client["wa_err_unit_tmp"]
        calls = []

        async def fake_send(**kw):
            calls.append(kw)
            return {"ok": False, "status": 400, "error": "{'message': 'Invalid Number', 'name': 'ERR400'}"}
        server._send_whatsapp_api = fake_send
        try:
            await server.db.settings.insert_one({"type": "lead_wa_routes", "templates": {route: "tmpl_x"}, "send_name_param": True})
            await server.db.campaign_leads.insert_one({"campaign_lead_id": "L1"})
            res = await server.send_routed_whatsapp(route, phone, "Ann", collection="campaign_leads", id_field="campaign_lead_id", doc_id="L1")
            doc = await server.db.campaign_leads.find_one({"campaign_lead_id": "L1"})
            return res, doc, calls
        finally:
            await client.drop_database("wa_err_unit_tmp")
            server.db, server._send_whatsapp_api = orig_db, orig_send
    res, doc, calls = asyncio.run(run())
    assert len(calls) == 1 and res["ok"] is False
    wa = doc["whatsapp"]
    assert wa["status"] == "failed"
    assert wa["sent_to"] == expected_to
    assert wa["error"] == f"WhatsApp rejected {expected_to}: the number is not on WhatsApp or is not a real number"
    print(route, wa)
