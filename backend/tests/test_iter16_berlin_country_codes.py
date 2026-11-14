# Iteration 16: Berlin allowed calling codes (_berlin_phone_problem), send_routed_whatsapp guard,
# sync marks unlisted codes 'invalid' + fills Country from phone; live Berlin connect with name/phone only.
# SAFE: unit tests use a temp DB + monkeypatched senders. Live test does a FIRST import only (no WhatsApp).
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
BERLIN = {"email": "navyaarora@visaxpert.co", "password": "VisaXpert@2024"}
EU_GID, NONEU_GID, CENTRAL_GID = "2139819490", "1551110032", "99742259"
BERLIN_HEADINGS = ["Date", "Name", "Phone", "Email", "City", "Country", "Campaign", "Form"]

ALLOWED = ["+4917612345678", "+35679123456", "+37061234567", "+37121234567", "+96891234567", "+919876543210",
           "+12684641234", "+79161234567", "+263771234567", "+8801712345678", "+2348031234567", "+447911123456",
           "+393123456789"]
UNLISTED = {"+38344123456": 383, "+970599123456": 970, "+299221234": 299}


def berlin_cols():
    c = [{"heading": h, "sheet_column": ""} for h in BERLIN_HEADINGS]
    c[1]["sheet_column"] = "full_name"
    c[2]["sheet_column"] = "phone"
    c[5]["sheet_column"] = "country"
    return c


# --- Unit: _berlin_phone_problem ---
def test_berlin_codes_listed_and_unlisted():
    import server
    assert len(server.BERLIN_ALLOWED_CALLING_CODES) >= 165
    for p in ALLOWED:
        assert server._berlin_phone_problem(p) == "", p
    for p, cc in UNLISTED.items():
        assert server._berlin_phone_problem(p) == f"Country code +{cc} is not in the supported country list"


# --- Unit: send_routed_whatsapp does not call the API for unlisted Berlin codes ---
def test_send_routed_whatsapp_guard(monkeypatch):
    import server
    calls = []

    async def fake_routes():
        return {"templates": {"berlin": "tpl_berlin"}, "send_name_param": True}

    async def fake_api(**kw):
        calls.append(kw)
        return {"ok": True}
    monkeypatch.setattr(server, "_get_wa_routes", fake_routes)
    monkeypatch.setattr(server, "_send_whatsapp_api", fake_api)
    res = asyncio.run(server.send_routed_whatsapp("berlin", "+38344123456", "Ann"))
    assert res["ok"] is False
    assert "Country code +383 is not in the supported country list" in res["error"]
    assert calls == []
    res = asyncio.run(server.send_routed_whatsapp("berlin", "+35679123456", "Bob"))
    assert res["ok"] is True and len(calls) == 1
    assert calls[0]["to_phone"] == "+35679123456" and calls[0]["api_key_override"] == server.AISENSY_API_KEY_UC


# --- Unit: sync marks unlisted invalid, fills Country, never queues unlisted ---
def test_sync_invalid_and_country_fill():
    import server
    from motor.motor_asyncio import AsyncIOMotorClient

    async def run():
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL") or "mongodb://localhost:27017")
        orig = (server.db, server.fetch_google_sheet_csv, server.send_routed_whatsapp)
        server.db = client["iter16_unit_tmp"]
        queued = []

        async def fake_csv(url):
            return ("full_name,phone,country\nMal,+35679123456,\nOma,+96891234567,\nKos,+38344123456,\n"
                    "Pal,+970599123456,\nGre,+299221234,\nGer,+4917612345678,Germany\n")

        async def fake_send(route_key, phone, *a, **kw):
            queued.append(phone)
            return {"ok": True}
        server.fetch_google_sheet_csv, server.send_routed_whatsapp = fake_csv, fake_send
        try:
            sheet = {"campaign_sheet_id": "S16", "account": "berlin", "spreadsheet_url": SHEET_URL, "gid": NONEU_GID,
                     "label": "NON-EU", "columns": berlin_cols(), "phone_col": 2, "name_col": 1, "branch_col": 5,
                     "online_branch_col": -1, "last_sync": None}
            await server.db.campaign_sheets.insert_one(dict(sheet))
            r = await server._do_campaign_sheet_sync(sheet, send_to_existing=True)
            await asyncio.sleep(0.2)
            leads = {d["name"]: d async for d in server.db.campaign_leads.find({}, {"_id": 0})}
            return r, leads, queued
        finally:
            await client.drop_database("iter16_unit_tmp")
            server.db, server.fetch_google_sheet_csv, server.send_routed_whatsapp = orig

    r, leads, queued = asyncio.run(run())
    assert r["imported"] == 6 and r["whatsapp_queued"] == 3
    assert sorted(queued) == sorted(["+35679123456", "+96891234567", "+4917612345678"])
    assert leads["Mal"]["values"][5] == "Malta" and leads["Oma"]["values"][5] == "Oman"
    assert leads["Ger"]["values"][5] == "Germany"
    for n, cc in (("Kos", 383), ("Pal", 970), ("Gre", 299)):
        assert leads[n]["whatsapp"]["status"] == "invalid"
        assert leads[n]["whatsapp"]["error"] == f"Country code +{cc} is not in the supported country list"
    assert leads["Mal"]["whatsapp"] is None


# --- Live: Berlin connect with name/phone-only mapping (first import only, no sends) then delete ---
def test_live_berlin_connect_name_phone_only():
    q = f"email={BERLIN['email']}&password={BERLIN['password']}"
    before = {s["gid"] for s in requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{q}").json()["sheets"]}
    gid = next(g for g in (EU_GID, NONEU_GID, CENTRAL_GID) if g not in before)
    cols = berlin_cols()
    cols[5]["sheet_column"] = ""
    body = {"spreadsheet_url": SHEET_URL, "gid": gid, "tab_name": "TEST_tab", "label": "TEST_iter16",
            "columns": cols, "phone_col": 2, "name_col": 1, "branch_col": 5, "online_branch_col": -1,
            "auto_sync_enabled": False}
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets?{q}", json=body)
    assert r.status_code == 200, r.text
    sid = r.json()["campaign_sheet_id"]
    try:
        s = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync?{q}", json={"send_to_existing": False}, timeout=90)
        assert s.status_code == 200, s.text
        assert s.json()["whatsapp_queued"] == 0
        leads = requests.get(f"{BASE_URL}/api/dashboard/campaign-leads?{q}&sheet_id={sid}&per_page=200").json()
        items = leads.get("leads") or leads.get("items") or []
        print("gid", gid, "imported", s.json()["imported"], "statuses",
              {st: sum(1 for x in items if (x.get("whatsapp") or {}).get("status") == st) for st in ("skipped", "invalid", "duplicate", "sent", "failed")})
        assert items
        for x in items:
            assert (x.get("whatsapp") or {}).get("status") in ("skipped", "invalid", "duplicate")
            if x.get("phone"):
                assert x["phone"].startswith("+")
        with_phone = [x for x in items if x.get("phone") and x["whatsapp"]["status"] != "invalid"]
        assert all(x["values"][5] for x in with_phone[:20]), [x["values"] for x in with_phone[:5]]
    finally:
        d = requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}?{q}")
        assert d.status_code == 200
