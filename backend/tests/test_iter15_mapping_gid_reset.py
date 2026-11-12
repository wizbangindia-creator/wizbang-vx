# Iteration 15 retest: phone-mapping fallback in sync, PUT gid change resets last_sync/leads, resend friendly error.
# SAFE: only first-imports (send_to_existing False -> no WhatsApp). Unit tests monkeypatch all senders. No real sends.
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
EU_GID, NONEU_GID, CENTRAL_GID = "2139819490", "1551110032", "99742259"
HEADINGS = ["Date", "Name", "Phone", "Email", "City", "Branch", "Country", "Campaign"]


def cols(phone_col_name):
    c = [{"heading": h, "sheet_column": ""} for h in HEADINGS]
    c[1]["sheet_column"] = "full_name"
    c[2]["sheet_column"] = phone_col_name
    return c


# --- Unit: _guess_sheet_column synonyms ---
def test_guess_sheet_column():
    import server
    assert server._guess_sheet_column("Phone", ["full_name", "phone"]) == "phone"
    assert server._guess_sheet_column("Phone", ["full_name", "phone_number"]) == "phone_number"
    assert server._guess_sheet_column("Name", ["full_name", "phone"]) == "full_name"
    assert server._guess_sheet_column("Nothing", ["a", "b"]) == ""


# --- Unit: sync falls back to name-matching when mapped column (phone_number) is absent (EU uses 'phone') ---
def test_sync_fallback_unit():
    import server
    from motor.motor_asyncio import AsyncIOMotorClient

    async def run():
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL") or "mongodb://localhost:27017")
        orig = (server.db, server.fetch_google_sheet_csv, server.send_routed_whatsapp, server._send_whatsapp_api)
        server.db = client["iter15_unit_tmp"]
        sent = []

        async def fake_csv(url):
            return "full_name,phone,email\nAnn,+4917612345678,a@x.de\nBob,+96891234567,b@x.de\n"

        async def fake_send(*a, **kw):
            sent.append((a, kw))
            return {"ok": True}
        server.fetch_google_sheet_csv, server.send_routed_whatsapp, server._send_whatsapp_api = fake_csv, fake_send, fake_send
        try:
            sheet = {"campaign_sheet_id": "S1", "account": "berlin", "spreadsheet_url": SHEET_URL, "gid": EU_GID,
                     "label": "EU", "columns": cols("phone_number"), "phone_col": 2, "name_col": 1, "branch_col": 5,
                     "online_branch_col": -1, "last_sync": None}
            await server.db.campaign_sheets.insert_one(dict(sheet))
            res = await server._do_campaign_sheet_sync(sheet, False)
            leads = await server.db.campaign_leads.find({}, {"_id": 0}).to_list(10)
            return res, leads, sent
        finally:
            await client.drop_database("iter15_unit_tmp")
            server.db, server.fetch_google_sheet_csv, server.send_routed_whatsapp, server._send_whatsapp_api = orig
    res, leads, sent = asyncio.run(run())
    assert res["imported"] == 2 and res["whatsapp_queued"] == 0 and not sent
    assert sorted(l["phone"] for l in leads) == ["+4917612345678", "+96891234567"]
    assert all(l["name"] in ("Ann", "Bob") for l in leads)


# --- Unit: resend endpoint returns the friendly error (monkeypatched _send_whatsapp_api) ---
def test_resend_returns_friendly_error():
    import server
    import httpx
    from motor.motor_asyncio import AsyncIOMotorClient

    async def run():
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL") or "mongodb://localhost:27017")
        orig = (server.db, server._send_whatsapp_api)
        server.db = client["iter15_resend_tmp"]
        calls = []

        async def fake_send(**kw):
            calls.append(kw)
            return {"ok": False, "status": 400, "error": "{'message': 'Invalid Number', 'name': 'ERR400'}"}
        server._send_whatsapp_api = fake_send
        try:
            await server.db.settings.insert_one({"type": "lead_wa_routes", "templates": {"berlin": "tmpl_x"}, "send_name_param": True})
            await server.db.campaign_leads.insert_one({"campaign_lead_id": "L1", "account": "berlin", "phone": "+4917612345678", "name": "Ann"})
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=server.app), base_url="http://t") as c:
                r = await c.post("/api/dashboard/campaign-leads/L1/resend", params=BERLIN)
            doc = await server.db.campaign_leads.find_one({"campaign_lead_id": "L1"})
            return r, doc, calls
        finally:
            await client.drop_database("iter15_resend_tmp")
            server.db, server._send_whatsapp_api = orig
    r, doc, calls = asyncio.run(run())
    assert r.status_code == 200, r.text
    d = r.json()
    expected = "WhatsApp rejected +4917612345678: the number is not on WhatsApp or is not a real number"
    assert d["success"] is False and d["error"] == expected
    assert doc["whatsapp"]["error"] == expected and len(calls) == 1


# --- Live: Berlin EU first import with 'phone' mapping; PUT gid change resets last_sync and drops old leads ---
def _leads(creds, sid):
    return requests.get(f"{BASE_URL}/api/dashboard/campaign-leads", params={**creds, "sheet_id": sid, "per_page": 200}, timeout=30).json()


def test_live_berlin_import_and_gid_reset():
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets", params=BERLIN, json={
        "spreadsheet_url": SHEET_URL, "spreadsheet_title": "VisaXpert Campaign Leads", "gid": EU_GID, "tab_name": "EU",
        "label": "TEST_EU", "columns": cols("phone"), "auto_sync_enabled": False}, timeout=20)
    assert r.status_code == 200, r.text
    sid = r.json()["campaign_sheet_id"]
    try:
        s = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync", params=BERLIN, json={"send_to_existing": False}, timeout=90)
        assert s.status_code == 200, s.text
        assert s.json()["whatsapp_queued"] == 0 and s.json()["imported"] > 0
        items = _leads(BERLIN, sid)["items"]
        with_phone = [i for i in items if i["phone"]]
        print("EU imported", len(items), "with phone", len(with_phone))
        assert len(with_phone) >= 0.8 * len(items)
        assert all(i["phone"].startswith("+") for i in with_phone)
        # PUT gid change -> reset
        u = requests.put(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}", params=BERLIN, json={
            "spreadsheet_url": SHEET_URL, "spreadsheet_title": "VisaXpert Campaign Leads", "gid": NONEU_GID, "tab_name": "NON-EU",
            "label": "TEST_NONEU", "columns": cols("phone"), "auto_sync_enabled": False}, timeout=20)
        assert u.status_code == 200, u.text
        assert u.json()["last_sync"] is None and u.json()["gid"] == NONEU_GID
        assert _leads(BERLIN, sid)["total"] == 0
        lst = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets", params=BERLIN, timeout=20).json()["sheets"]
        cur = next(x for x in lst if x["campaign_sheet_id"] == sid)
        assert cur["last_sync"] is None  # guard: only then is the next sync a first import (no WhatsApp)
        s2 = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync", params=BERLIN, json={"send_to_existing": False}, timeout=90)
        assert s2.status_code == 200 and s2.json()["whatsapp_queued"] == 0 and s2.json()["imported"] > 0
        items2 = _leads(BERLIN, sid)["items"]
        assert all(i["sheet_label"] == "TEST_NONEU" for i in items2)
        assert all(i["whatsapp"]["status"] in ("skipped", "duplicate", "invalid") for i in items2)
        # PUT same gid (label only) keeps last_sync + leads
        u2 = requests.put(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}", params=BERLIN, json={
            "spreadsheet_url": SHEET_URL, "gid": NONEU_GID, "tab_name": "NON-EU", "label": "TEST_NONEU2",
            "columns": cols("phone"), "auto_sync_enabled": False}, timeout=20)
        assert u2.status_code == 200 and u2.json()["last_sync"] is not None
        assert _leads(BERLIN, sid)["total"] == len(items2)
    finally:
        d = requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}", params=BERLIN, timeout=20)
        assert d.status_code == 200


# --- Live: mixed tabs (India Centralized + EU) with India mapping phone_number -> EU leads still get phones ---
def test_live_mixed_tabs_fallback_india():
    created = []
    try:
        for gid, name in [(CENTRAL_GID, "Centralized"), (EU_GID, "EU")]:
            r = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets", params=INDIA, json={
                "spreadsheet_url": SHEET_URL, "gid": gid, "tab_name": name, "label": f"TEST_{name}",
                "columns": cols("phone_number"), "auto_sync_enabled": False}, timeout=20)
            assert r.status_code == 200, r.text
            created.append(r.json()["campaign_sheet_id"])
        for sid in created:
            s = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync", params=INDIA, json={"send_to_existing": False}, timeout=90)
            assert s.status_code == 200 and s.json()["whatsapp_queued"] == 0, s.text
            items = _leads(INDIA, sid)["items"]
            with_phone = [i for i in items if i["phone"]]
            print(sid, len(items), len(with_phone))
            assert items and len(with_phone) >= 0.8 * len(items)
    finally:
        for sid in created:
            assert requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}", params=INDIA, timeout=20).status_code == 200
