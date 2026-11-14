# Iteration 17: AiSensy destination has leading '+', Berlin layout migration (no Preferred Branch),
# Berlin sync takes Country from phone + branch '', send-skipped?status=failed picks failed leads, 422 for bad status.
# SAFE: no real WhatsApp. httpx/send_routed_whatsapp are monkeypatched; unit DB tests use a temp database.
import asyncio
import os
import sys

import phonenumbers
import pytest
import requests
from phonenumbers import geocoder

sys.path.insert(0, "/app/backend")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
SHEET_URL = "https://docs.google.com/spreadsheets/d/11qQKV39XNNGwQ9IWCw671BdvKQsVXOjEko1EOD6PK6Q/edit"
BERLIN_Q = "email=navyaarora%40visaxpert.co&password=VisaXpert%402024"
ADMIN_Q = "email=admin%40visaxpert.com&password=VisaXpert%402024"
CENTRAL_GID = "99742259"
BERLIN_HEADINGS = ["Date", "Name", "Phone", "Email", "City", "Country", "Campaign", "Form"]
TMP_DB = "iter17_unit_tmp"


# --- Unit: _send_via_aisensy destination starts with '+' (UC and India keys) ---
@pytest.mark.parametrize("phone,uc,expected", [
    ("+4915226091787", True, "+4915226091787"),
    ("015226091787", True, "+4915226091787"),
    ("+96894296116", True, "+96894296116"),
    ("+919876543210", True, "+919876543210"),
    ("9876543210", False, "+919876543210"),
    ("+96894296116", False, "+96894296116"),
])
def test_aisensy_destination_plus(monkeypatch, phone, uc, expected):
    import httpx
    import server
    sent = []

    class FakeResp:
        status_code = 200
        text = "{}"

        def json(self):
            return {"ok": True}

    async def fake_post(self, url, json=None, **kw):
        sent.append(json)
        return FakeResp()
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    key = server.AISENSY_API_KEY_UC if uc else (server.AISENSY_API_KEY or "india_key")
    res = asyncio.run(server._send_via_aisensy(phone, "tpl", "en", ["A"], None, api_key_override=key))
    assert res["ok"] is True
    assert len(sent) == 1
    assert sent[0]["destination"] == expected
    assert sent[0]["apiKey"] == key


# --- Live: navya leads use Berlin layout, Country from phone, no branch ---
def test_live_berlin_leads_layout():
    r = requests.get(f"{BASE_URL}/api/dashboard/campaign-leads?{BERLIN_Q}&per_page=200", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["headings"] == BERLIN_HEADINGS
    assert "Preferred Branch" not in d["headings"]
    assert d["total"] >= 178
    assert isinstance(d["failed_count"], int)
    mism = []
    for x in d["items"]:
        assert len(x["values"]) == 8
        assert x["branch"] == ""
        if x["phone"]:
            c = geocoder.country_name_for_number(phonenumbers.parse(x["phone"], None), "en")
            if c and c != x["values"][5]:
                mism.append((x["phone"], x["values"][5], c))
    assert not mism, mism
    oman = [x for x in d["items"] if x["phone"].startswith("+968")]
    assert oman and all(x["values"][5] == "Oman" for x in oman)
    # values[6] is Campaign (a manually typed sheet row may have none)
    with_phone = [x for x in d["items"] if x["phone"]]
    assert sum(1 for x in with_phone if x["values"][6]) >= 0.95 * len(with_phone)
    sheets = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{BERLIN_Q}").json()["sheets"]
    for s in sheets:
        assert [c["heading"] for c in s["columns"]] == BERLIN_HEADINGS


# --- Unit: new Berlin sync: Country from phone even if sheet says otherwise; branch ''; study-country not mapped ---
def test_unit_berlin_sync_country_from_phone():
    import server
    from motor.motor_asyncio import AsyncIOMotorClient

    async def run():
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL") or "mongodb://localhost:27017")
        orig = (server.db, server.fetch_google_sheet_csv, server.send_routed_whatsapp)
        server.db = client[TMP_DB]

        async def fake_csv(url):
            return ("full_name,phone_number,which_country_are_you_planning_to_study_in?,campaign_name\n"
                    "Oma,+96894296116,Germany,CampA\nMal,+35679123456,Canada,CampB\n")

        async def fake_send(*a, **kw):
            return {"ok": True}
        server.fetch_google_sheet_csv, server.send_routed_whatsapp = fake_csv, fake_send
        try:
            cols = [{"heading": h, "sheet_column": ""} for h in BERLIN_HEADINGS]
            cols[1]["sheet_column"], cols[2]["sheet_column"], cols[6]["sheet_column"] = "full_name", "phone_number", "campaign_name"
            sheet = {"campaign_sheet_id": "S17", "account": "berlin", "spreadsheet_url": SHEET_URL, "gid": CENTRAL_GID,
                     "label": "T", "columns": cols, "phone_col": 2, "name_col": 1, "branch_col": 5,
                     "online_branch_col": -1, "last_sync": None}
            await server.db.campaign_sheets.insert_one(dict(sheet))
            await server._do_campaign_sheet_sync(sheet, send_to_existing=False)
            return {d["name"]: d async for d in server.db.campaign_leads.find({}, {"_id": 0})}
        finally:
            await client.drop_database(TMP_DB)
            server.db, server.fetch_google_sheet_csv, server.send_routed_whatsapp = orig

    leads = asyncio.run(run())
    assert leads["Oma"]["values"][5] == "Oman" and leads["Mal"]["values"][5] == "Malta"
    assert leads["Oma"]["values"][6] == "CampA"
    assert leads["Oma"]["branch"] == "" and leads["Mal"]["branch"] == ""


# --- Unit: send-skipped?status=failed picks only failed leads of the account (monkeypatched sender) ---
def test_unit_send_skipped_failed(monkeypatch):
    import server
    from motor.motor_asyncio import AsyncIOMotorClient
    calls = []

    async def fake_send(route_key, phone, name="", **kw):
        calls.append((route_key, phone))
        await server.db.campaign_leads.update_one({"campaign_lead_id": kw["doc_id"]},
                                                  {"$set": {"whatsapp.status": "sent"}})
        return {"ok": True}
    monkeypatch.setattr(server, "send_routed_whatsapp", fake_send)

    async def run():
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL") or "mongodb://localhost:27017")
        orig = server.db
        server.db = client[TMP_DB + "_b"]
        try:
            docs = [("f1", "berlin", "+4915226091787", "failed"), ("f2", "berlin", "+96894296116", "failed"),
                    ("s1", "berlin", "+35679123456", "skipped"), ("n1", "berlin", "", "failed"),
                    ("i1", "india", "9876543210", "failed")]
            await server.db.campaign_leads.insert_many([
                {"campaign_lead_id": i, "account": a, "phone": p, "name": i, "branch": "", "online_branch": "",
                 "whatsapp": {"status": st}} for i, a, p, st in docs])
            user = {"access": "university_change"}
            monkeypatch.setattr(server, "_require_india_access", lambda e, p: user)
            res = await server.send_skipped_campaign_leads(email="x", password="y", status="failed")
            await asyncio.sleep(1.5)
            states = {d["campaign_lead_id"]: d["whatsapp"]["status"] async for d in server.db.campaign_leads.find({}, {"_id": 0})}
            return res, states
        finally:
            await client.drop_database(TMP_DB + "_b")
            server.db = orig

    res, states = asyncio.run(run())
    assert res == {"success": True, "queued": 2}
    assert sorted(calls) == [("berlin", "+4915226091787"), ("berlin", "+96894296116")]
    assert states["s1"] == "skipped" and states["n1"] == "failed" and states["i1"] == "failed"


# --- Live: invalid status rejected with 422 (nothing queued) ---
def test_live_send_skipped_bad_status_422():
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-leads/send-skipped?{BERLIN_Q}&status=foo", timeout=30)
    assert r.status_code == 422


# --- Regression: allowlist still blocks +383 ---
def test_allowlist_blocks_383():
    import server
    assert server._berlin_phone_problem("+38344123456") == "Country code +383 is not in the supported country list"
    assert server._berlin_phone_problem("+96894296116") == ""


# --- Live: temp Berlin connection on Centralized tab (first import only), Country from phone; delete leaves EU/NON-EU intact ---
def test_live_temp_berlin_connection():
    before_sheets = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{BERLIN_Q}").json()["sheets"]
    assert CENTRAL_GID not in {s["gid"] for s in before_sheets}
    before = requests.get(f"{BASE_URL}/api/dashboard/campaign-leads?{BERLIN_Q}&per_page=1").json()["total"]
    cols = [{"heading": h, "sheet_column": ""} for h in BERLIN_HEADINGS]
    cols[1]["sheet_column"], cols[2]["sheet_column"] = "full_name", "phone_number"
    body = {"spreadsheet_url": SHEET_URL, "gid": CENTRAL_GID, "tab_name": "TEST_central", "label": "TEST_iter17",
            "columns": cols, "phone_col": 2, "name_col": 1, "branch_col": 5, "online_branch_col": -1,
            "auto_sync_enabled": False}
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets?{BERLIN_Q}", json=body)
    assert r.status_code == 200, r.text
    sid = r.json()["campaign_sheet_id"]
    try:
        s = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync?{BERLIN_Q}",
                          json={"send_to_existing": False}, timeout=90)
        assert s.status_code == 200 and s.json()["whatsapp_queued"] == 0
        items = requests.get(f"{BASE_URL}/api/dashboard/campaign-leads?{BERLIN_Q}&sheet_id={sid}&per_page=200").json()["items"]
        assert items
        for x in items:
            assert x["branch"] == ""
            assert x["whatsapp"]["status"] in ("skipped", "invalid", "duplicate")
            if x["phone"]:
                c = geocoder.country_name_for_number(phonenumbers.parse(x["phone"], None), "en")
                if c:
                    assert x["values"][5] == c, (x["phone"], x["values"])
    finally:
        d = requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}?{BERLIN_Q}")
        assert d.status_code == 200
    after = requests.get(f"{BASE_URL}/api/dashboard/campaign-leads?{BERLIN_Q}&per_page=1").json()["total"]
    assert after >= before  # auto-sync on EU/NON-EU may add rows, never removes
    after_sheets = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{BERLIN_Q}").json()["sheets"]
    assert {s["campaign_sheet_id"] for s in after_sheets} == {s["campaign_sheet_id"] for s in before_sheets}


# --- Regression: India admin still on 8-column default with Preferred Branch ---
def test_live_india_headings():
    d = requests.get(f"{BASE_URL}/api/dashboard/campaign-leads?{ADMIN_Q}&per_page=1").json()
    assert d["account"] == "india"
    assert "Preferred Branch" in d["headings"] and len(d["headings"]) == 8
