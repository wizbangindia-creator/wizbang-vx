# Iteration 18: India "Online" branch -> online_<branch> route from a separate sheet column (online_branch_column).
# SAFE: no real WhatsApp. Live test does a first import only (send_to_existing False, auto-sync off) and deletes
# the connection afterwards. Second-sync test uses a temp DB with monkeypatched send_routed_whatsapp.
import asyncio
import collections
import csv
import io
import os
import sys
import urllib.parse

import pytest
import requests
from pymongo import MongoClient

sys.path.insert(0, "/app/backend")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
ENV = {k: v.strip().strip('"') for k, v in (l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)}
SHEET_URL = "https://docs.google.com/spreadsheets/d/11qQKV39XNNGwQ9IWCw671BdvKQsVXOjEko1EOD6PK6Q/edit"
ADMIN_Q = "email=admin%40visaxpert.com&password=VisaXpert%402024"
BERLIN_Q = "email=navyaarora%40visaxpert.co&password=VisaXpert%402024"
CENTRAL_GID = "99742259"
PATHANKOT_GID = "545121451"
BR_COL = "how_would_you_prefer_to_attend_a_counselling_session?"
ON_COL = "which_branch_would_you_prefer_for_your_online_counselling_session?"
TMP_DB = "iter18_unit_tmp"
COLUMNS = [{"heading": h, "sheet_column": c} for h, c in [
    ("Date", "created_time"), ("Name", "full_name"), ("Phone", "phone_number"), ("Email", ""),
    ("City", "city"), ("Preferred Branch", BR_COL), ("Country", "which_country_are_you_planning_to_study_in?"),
    ("Campaign", "campaign_name")]]


def _preview(gid):
    u = urllib.parse.quote(f"{SHEET_URL}#gid={gid}")
    r = requests.post(f"{BASE_URL}/api/dashboard/sheets/preview?{ADMIN_Q}&sheet_url={u}&sample_size=2", timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


def _expected(b, o):
    import server
    return server._branch_route_key(b, o)


# --- Live: preview returns columns_with_online ---
def test_preview_columns_with_online_central():
    d = _preview(CENTRAL_GID)
    assert isinstance(d["columns_with_online"], list)
    assert BR_COL in d["columns_with_online"]
    assert ON_COL not in d["columns_with_online"]


def test_preview_columns_with_online_pathankot():
    # Pathankot tab rows contain the value 'online' in its branch column (22 of 26 rows at iter18)
    d = _preview(PATHANKOT_GID)
    print("pathankot columns_with_online:", d["columns_with_online"])
    assert "columns_with_online" in d


# --- Unit: _branch_route_key ---
@pytest.mark.parametrize("b,o,exp", [
    ("online_counselling", "ludhiana_branch", "online_ludhiana"),
    ("online_counselling", "amritsar_branch", "online_amritsar"),
    ("online_counselling", "jammu_branch", "online_jammu"),
    ("online_counselling", "pathankot_branch_", "online_pathankot"),
    ("online_counselling", "", "online"),
    ("ludhiana_branch", "amritsar_branch", "ludhiana"),
    ("amritsar_branch", "", "amritsar"),
    ("jammu_branch", "", "jammu"),
    ("pathankot_branch_", "", "pathankot"),
    ("", "", None),
])
def test_branch_route_key(b, o, exp):
    assert _expected(b, o) == exp


# --- Live: first import of the Centralized tab, route_key distribution in DB, no WhatsApp; cleanup ---
def test_live_first_import_route_keys():
    payload = {"spreadsheet_url": SHEET_URL, "gid": CENTRAL_GID, "tab_name": "VisaXpert_Centralized_StudyAbroad_LeadForm-Final",
               "label": "TEST_iter18_online", "columns": COLUMNS, "phone_col": 2, "name_col": 1, "branch_col": 5,
               "online_branch_col": -1, "online_branch_column": ON_COL, "auto_sync_enabled": False, "sync_interval_minutes": 15}
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets?{ADMIN_Q}", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    sid = r.json()["campaign_sheet_id"]
    try:
        assert r.json()["online_branch_column"] == ON_COL
        g = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{ADMIN_Q}", timeout=30).json()["sheets"]
        assert [s for s in g if s["campaign_sheet_id"] == sid][0]["online_branch_column"] == ON_COL
        s = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync?{ADMIN_Q}",
                          json={"send_to_existing": False}, timeout=120)
        assert s.status_code == 200, s.text
        assert s.json()["whatsapp_queued"] == 0
        db = MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"].strip('"')]
        docs = list(db.campaign_leads.find({"campaign_sheet_id": sid}, {"_id": 0}))
        assert len(docs) == s.json()["imported"] > 0
        dist = collections.Counter(d["route_key"] for d in docs)
        print("route_key distribution:", dict(dist))
        wa = collections.Counter((d.get("whatsapp") or {}).get("status") for d in docs)
        print("whatsapp statuses:", dict(wa))
        assert None not in wa and "sent" not in wa and "failed" not in wa
        bad = [(d["branch"], d["online_branch"], d["route_key"]) for d in docs
               if d["route_key"] != _expected(d["branch"], d["online_branch"])]
        assert not bad, bad[:5]
        for d in docs:
            if "online" in d["branch"].lower() and d["online_branch"]:
                assert d["route_key"].startswith("online_")
            elif "online" not in d["branch"].lower() and d["branch"]:
                assert d["route_key"] in ("ludhiana", "amritsar", "jammu", "pathankot")
        for k in ("online_ludhiana", "online_amritsar", "online_jammu", "online_pathankot",
                  "ludhiana", "amritsar", "jammu", "pathankot"):
            assert dist[k] > 0, k
        # compare against raw CSV counts
        csvt = requests.get(f"https://docs.google.com/spreadsheets/d/11qQKV39XNNGwQ9IWCw671BdvKQsVXOjEko1EOD6PK6Q/export?format=csv&gid={CENTRAL_GID}", timeout=60).text
        raw = collections.Counter()
        for row in csv.DictReader(io.StringIO(csvt)):
            if row[ON_COL].startswith("ludhiana") and "online" in row[BR_COL]:
                raw["online_ludhiana"] += 1
        print("raw online_ludhiana:", raw["online_ludhiana"], "db:", dist["online_ludhiana"])
    finally:
        d = requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}?{ADMIN_Q}", timeout=30)
        assert d.status_code == 200
        print("deleted:", d.json())


# --- Unit: second sync with new rows calls send_routed_whatsapp with online_<branch> ---
def test_unit_second_sync_sends_online_route(monkeypatch):
    import server
    from motor.motor_asyncio import AsyncIOMotorClient
    calls = []
    hdr = ["created_time", "full_name", "phone_number", "city", BR_COL, ON_COL]
    rows1 = [["2026-01-01", "A Old", "+919876500001", "x", "online_counselling", "ludhiana_branch"]]
    rows2 = rows1 + [
        ["2026-01-02", "B New", "+919876500002", "x", "online_counselling", "ludhiana_branch"],
        ["2026-01-02", "C New", "+919876500003", "x", "online_counselling", "pathankot_branch_"],
        ["2026-01-02", "D New", "+919876500004", "x", "amritsar_branch", ""],
        ["2026-01-02", "E New", "+919876500005", "x", "online_counselling", ""],
    ]
    state = {"rows": rows1}

    def mk(rows):
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(hdr)
        w.writerows(rows)
        return buf.getvalue()

    async def fake_csv(url):
        return mk(state["rows"])

    async def fake_send(route_key, phone, name="", **kw):
        calls.append((route_key, phone, name))

    monkeypatch.setattr(server, "fetch_google_sheet_csv", fake_csv)
    monkeypatch.setattr(server, "send_routed_whatsapp", fake_send)

    async def run():
        client = AsyncIOMotorClient(ENV["MONGO_URL"])
        orig = server.db
        server.db = client[TMP_DB]
        try:
            sheet = {"campaign_sheet_id": "tmp-iter18", "account": "india", "spreadsheet_url": SHEET_URL, "gid": CENTRAL_GID,
                     "label": "T", "columns": COLUMNS, "phone_col": 2, "name_col": 1, "branch_col": 5,
                     "online_branch_col": -1, "online_branch_column": ON_COL, "last_sync": None}
            await server.db.campaign_sheets.insert_one(dict(sheet))
            r1 = await server._do_campaign_sheet_sync(dict(sheet))
            await asyncio.sleep(0.2)
            assert r1["whatsapp_queued"] == 0 and not calls
            s2 = await server.db.campaign_sheets.find_one({"campaign_sheet_id": "tmp-iter18"}, {"_id": 0})
            state["rows"] = rows2
            r2 = await server._do_campaign_sheet_sync(s2)
            await asyncio.sleep(0.2)
            return r2
        finally:
            await client.drop_database(TMP_DB)
            server.db = orig

    r2 = asyncio.run(run())
    assert r2["imported"] == 4 and r2["whatsapp_queued"] == 4
    got = {n: rk for rk, p, n in calls}
    assert got == {"B New": "online_ludhiana", "C New": "online_pathankot", "D New": "amritsar", "E New": "online"}, got


# --- Unit: no online_branch_column -> legacy behaviour (online rows -> 'online') ---
def test_unit_no_online_column_legacy(monkeypatch):
    import server
    from motor.motor_asyncio import AsyncIOMotorClient
    hdr = ["full_name", "phone_number", "where_would_you_prefer_to_attend_the_counselling_session?"]

    async def fake_csv(url):
        return ",".join(hdr) + "\nP1,+919876500011,online\nP2,+919876500012,pathankot_branch\n"

    monkeypatch.setattr(server, "fetch_google_sheet_csv", fake_csv)

    async def run():
        client = AsyncIOMotorClient(ENV["MONGO_URL"])
        orig = server.db
        server.db = client[TMP_DB + "_b"]
        try:
            cols = [dict(c) for c in COLUMNS]
            cols[5]["sheet_column"] = hdr[2]
            sheet = {"campaign_sheet_id": "tmp-iter18b", "account": "india", "spreadsheet_url": SHEET_URL, "gid": PATHANKOT_GID,
                     "label": "T", "columns": cols, "phone_col": 2, "name_col": 1, "branch_col": 5,
                     "online_branch_col": -1, "online_branch_column": "", "last_sync": None}
            await server.db.campaign_sheets.insert_one(dict(sheet))
            await server._do_campaign_sheet_sync(dict(sheet))
            return {d["name"]: d["route_key"] async for d in server.db.campaign_leads.find({}, {"_id": 0})}
        finally:
            await client.drop_database(TMP_DB + "_b")
            server.db = orig

    assert asyncio.run(run()) == {"P1": "online", "P2": "pathankot"}


# --- Regression: Berlin sheets untouched, no online_branch_column ---
def test_berlin_sheets_untouched():
    r = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{BERLIN_Q}", timeout=30)
    assert r.status_code == 200
    labels = {s["gid"]: s for s in r.json()["sheets"]}
    assert "2139819490" in labels and "1551110032" in labels
    for s in r.json()["sheets"]:
        assert not s.get("online_branch_column")
