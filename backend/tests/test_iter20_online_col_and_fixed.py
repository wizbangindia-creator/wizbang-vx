# Iteration 20: India online_branch_column + online_branch_fixed together (multi-tab Centralized + Pathankot).
# SAFE: first import only (send_to_existing False, auto-sync off); connections deleted by id afterwards.
import collections
import os

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
ENV = {k: v.strip().strip('"') for k, v in (l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)}
SHEET_URL = "https://docs.google.com/spreadsheets/d/11qQKV39XNNGwQ9IWCw671BdvKQsVXOjEko1EOD6PK6Q/edit"
ADMIN_Q = "email=admin%40visaxpert.com&password=VisaXpert%402024"
BERLIN_Q = "email=navyaarora%40visaxpert.co&password=VisaXpert%402024"
CENTRAL_GID, PK_GID = "99742259", "545121451"
CBR = "how_would_you_prefer_to_attend_a_counselling_session?"
ON_COL = "which_branch_would_you_prefer_for_your_online_counselling_session?"
PBR = "where_would_you_prefer_to_attend_the_counselling_session?"
KEYS = ("ludhiana", "amritsar", "jammu", "pathankot")


def cols(branch):
    return [{"heading": h, "sheet_column": c} for h, c in [
        ("Date", "created_time"), ("Name", "full_name"), ("Phone", "phone_number"), ("Email", ""),
        ("City", "city"), ("Preferred Branch", branch), ("Country", ""), ("Campaign", "campaign_name")]]


def payload(gid, label, branch, on_col="", fixed=""):
    return {"spreadsheet_url": SHEET_URL, "gid": gid, "tab_name": label, "label": label, "columns": cols(branch),
            "phone_col": 2, "name_col": 1, "branch_col": 5, "online_branch_col": -1, "online_branch_column": on_col,
            "online_branch_fixed": fixed, "auto_sync_enabled": False, "sync_interval_minutes": 15}


@pytest.fixture(scope="module")
def created():
    ids = []
    yield ids
    for sid in ids:
        requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}?{ADMIN_Q}", timeout=30)


@pytest.fixture(scope="module")
def mdb():
    return MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]]


def _create(p, created):
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets?{ADMIN_Q}", json=p, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    created.append(d["campaign_sheet_id"])
    assert d["online_branch_column"] == p["online_branch_column"]
    assert d["online_branch_fixed"] == p["online_branch_fixed"]
    assert d["auto_sync_enabled"] is False
    return d


def _sync(sid, mdb):
    s = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync?{ADMIN_Q}",
                      json={"send_to_existing": False}, timeout=180)
    assert s.status_code == 200, s.text
    assert s.json()["whatsapp_queued"] == 0
    docs = list(mdb.campaign_leads.find({"campaign_sheet_id": sid}, {"_id": 0}))
    wa = collections.Counter((d.get("whatsapp") or {}).get("status") for d in docs)
    assert "sent" not in wa and "queued" not in wa, wa
    return docs


# --- Multi-tab (same payload for both, as the UI sends): column set + fixed pathankot ---
def test_multi_tab_central_and_pathankot(created, mdb):
    c = _create(payload(CENTRAL_GID, "TEST_iter20_central", CBR, on_col=ON_COL, fixed="pathankot"), created)
    p = _create(payload(PK_GID, "TEST_iter20_pk", PBR, on_col=ON_COL, fixed="pathankot"), created)
    cdocs, pdocs = _sync(c["campaign_sheet_id"], mdb), _sync(p["campaign_sheet_id"], mdb)
    cd = collections.Counter(x["route_key"] for x in cdocs)
    pd = collections.Counter(x["route_key"] for x in pdocs)
    print("Central dist:", dict(cd), "n:", len(cdocs))
    print("Pathankot dist:", dict(pd), "n:", len(pdocs))
    # Centralized: online rows routed from their own column
    for k in KEYS:
        assert cd[f"online_{k}"] > 0, k
    bad_c, fallback_c = [], 0
    for x in cdocs:
        if "online" in x["branch"].lower():
            ob = x["online_branch"].lower()
            k = next((k for k in KEYS if k in ob), None)
            if k and x["route_key"] != f"online_{k}":
                bad_c.append(x)
            if x["online_branch"] == "pathankot":
                fallback_c += 1
    print("Centralized rows that fell back to fixed pathankot:", fallback_c)
    assert not bad_c, bad_c[:3]
    # Pathankot: every online row -> online_pathankot; offline rows keep online_branch ''
    assert pd["online_pathankot"] > 0 and pd.get("online", 0) == 0
    for x in pdocs:
        if "online" in x["branch"].lower():
            assert x["route_key"] == "online_pathankot", x
        else:
            assert x["online_branch"] == "", x


# --- Pathankot alone with fixed only: offline rows keep online_branch '' (iter19 minor fix) ---
def test_offline_rows_no_fixed(created, mdb):
    for sid in list(created):
        requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}?{ADMIN_Q}", timeout=30)
        created.remove(sid)
    p = _create(payload(PK_GID, "TEST_iter20_pk_only", PBR, fixed="pathankot"), created)
    docs = _sync(p["campaign_sheet_id"], mdb)
    offline = [x for x in docs if "online" not in x["branch"].lower()]
    online = [x for x in docs if "online" in x["branch"].lower()]
    print("offline:", len(offline), "online:", len(online))
    assert offline and online
    assert all(x["online_branch"] == "" for x in offline)
    assert all(x["online_branch"] == "pathankot" and x["route_key"] == "online_pathankot" for x in online)


# --- Cleanup + Berlin untouched ---
def test_cleanup_and_berlin(created, mdb):
    for sid in list(created):
        r = requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}?{ADMIN_Q}", timeout=30)
        assert r.status_code == 200
        created.remove(sid)
    g = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{ADMIN_Q}", timeout=30).json()["sheets"]
    assert not [s for s in g if s["label"].startswith("TEST_iter20")]
    assert mdb.campaign_leads.count_documents({"sheet_label": {"$regex": "^TEST_iter20"}}) == 0
    b = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{BERLIN_Q}", timeout=30).json()["sheets"]
    assert {"2139819490", "1551110032"} <= {s["gid"] for s in b}
    for s in b:
        assert not s.get("online_branch_column") and not s.get("online_branch_fixed")


# --- Exact UI multi-tab payload: Pathankot tab with Centralized's branch header (guessed at sync) ---
def test_pathankot_with_ui_payload(created, mdb):
    p = _create(payload(PK_GID, "TEST_iter20_pk_ui", CBR, on_col=ON_COL, fixed="pathankot"), created)
    docs = _sync(p["campaign_sheet_id"], mdb)
    d = collections.Counter(x["route_key"] for x in docs)
    print("Pathankot (UI payload) dist:", dict(d), "n:", len(docs), "branches:", collections.Counter(x["branch"] for x in docs))
    assert d["online_pathankot"] > 0 and d.get("online", 0) == 0 and None not in d
    requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{p['campaign_sheet_id']}?{ADMIN_Q}", timeout=30)
    created.remove(p["campaign_sheet_id"])
    assert mdb.campaign_leads.count_documents({"campaign_sheet_id": p["campaign_sheet_id"]}) == 0
