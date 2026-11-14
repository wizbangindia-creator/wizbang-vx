# Iteration 19: India online_branch_fixed (Pathankot tabs -> online_pathankot). SAFE: first import only
# (send_to_existing False, auto-sync off); every connection created here is deleted by id afterwards.
import collections
import os
import urllib.parse

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
CENTRAL_GID, PK_GID, PK2_GID = "99742259", "545121451", "1798667875"
CBR = "how_would_you_prefer_to_attend_a_counselling_session?"
ON_COL = "which_branch_would_you_prefer_for_your_online_counselling_session?"
PBR = "where_would_you_prefer_to_attend_the_counselling_session?"


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
    created.append(r.json()["campaign_sheet_id"])
    return r.json()


# --- online_branch_fixed validation / persistence ---
@pytest.mark.parametrize("val,exp", [("pathankot", "pathankot"), ("Jammu", "jammu"), ("delhi", ""), ("online_pathankot", "")])
def test_fixed_validation(val, exp, created):
    # use the Pathankot copy tab; delete immediately so later tests can reuse the gid
    d = _create(payload(PK2_GID, "TEST_iter19_val", PBR, fixed=val), created)
    try:
        assert d["online_branch_fixed"] == exp
        g = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{ADMIN_Q}", timeout=30).json()["sheets"]
        assert [s for s in g if s["campaign_sheet_id"] == d["campaign_sheet_id"]][0]["online_branch_fixed"] == exp
    finally:
        requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{d['campaign_sheet_id']}?{ADMIN_Q}", timeout=30)
        created.remove(d["campaign_sheet_id"])


def test_put_updates_fixed(created):
    d = _create(payload(PK2_GID, "TEST_iter19_put", PBR, fixed="pathankot"), created)
    try:
        r = requests.put(f"{BASE_URL}/api/dashboard/campaign-sheets/{d['campaign_sheet_id']}?{ADMIN_Q}",
                         json=payload(PK2_GID, "TEST_iter19_put", PBR, fixed="ludhiana"), timeout=30)
        assert r.status_code == 200 and r.json()["online_branch_fixed"] == "ludhiana"
    finally:
        requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{d['campaign_sheet_id']}?{ADMIN_Q}", timeout=30)
        created.remove(d["campaign_sheet_id"])


def _sync_dist(sid, mdb):
    s = requests.post(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}/sync?{ADMIN_Q}",
                      json={"send_to_existing": False}, timeout=180)
    assert s.status_code == 200, s.text
    assert s.json()["whatsapp_queued"] == 0
    docs = list(mdb.campaign_leads.find({"campaign_sheet_id": sid}, {"_id": 0}))
    wa = collections.Counter((d.get("whatsapp") or {}).get("status") for d in docs)
    assert None not in wa and "sent" not in wa, wa
    return docs, wa


# --- Live first import: Pathankot tab with fixed pathankot ---
def test_live_pathankot_fixed(created, mdb):
    d = _create(payload(PK_GID, "TEST_iter19_pk", PBR, fixed="pathankot"), created)
    docs, wa = _sync_dist(d["campaign_sheet_id"], mdb)
    dist = collections.Counter(x["route_key"] for x in docs)
    print("Pathankot dist:", dict(dist), "wa:", dict(wa), "n:", len(docs))
    assert dist["online_pathankot"] > 0
    assert dist.get("online", 0) == 0
    for x in docs:
        if "online" in x["branch"].lower():
            assert x["route_key"] == "online_pathankot", x
        elif "pathankot" in x["branch"].lower():
            assert x["route_key"] == "pathankot"


# --- Live first import: Pathankot copy tab with fixed pathankot ---
def test_live_pathankot_copy_fixed(created, mdb):
    d = _create(payload(PK2_GID, "TEST_iter19_pk2", PBR, fixed="pathankot"), created)
    docs, wa = _sync_dist(d["campaign_sheet_id"], mdb)
    dist = collections.Counter(x["route_key"] for x in docs)
    print("Pathankot copy dist:", dict(dist), "wa:", dict(wa), "n:", len(docs))
    assert dist["online_pathankot"] > 0 and dist.get("online", 0) == 0


# --- Live first import: Centralized still online_<branch> from column ---
def test_live_central_column(created, mdb):
    d = _create(payload(CENTRAL_GID, "TEST_iter19_central", CBR, on_col=ON_COL), created)
    docs, wa = _sync_dist(d["campaign_sheet_id"], mdb)
    dist = collections.Counter(x["route_key"] for x in docs)
    print("Central dist:", dict(dist), "wa:", dict(wa), "n:", len(docs))
    for k in ("online_ludhiana", "online_amritsar", "online_jammu", "online_pathankot"):
        assert dist[k] > 0, k
    # online_pathankot must not be inflated; online rows are routed from the column
    for x in docs:
        if "online" in x["branch"].lower() and x["online_branch"]:
            assert x["route_key"] == "online_" + next(k for k in ("ludhiana", "amritsar", "jammu", "pathankot") if k in x["online_branch"])


# --- Cleanup check + Berlin regression ---
def test_cleanup_and_berlin(created, mdb):
    for sid in list(created):
        r = requests.delete(f"{BASE_URL}/api/dashboard/campaign-sheets/{sid}?{ADMIN_Q}", timeout=30)
        assert r.status_code == 200
        created.remove(sid)
    g = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{ADMIN_Q}", timeout=30).json()["sheets"]
    assert not [s for s in g if s["label"].startswith("TEST_iter19")]
    b = requests.get(f"{BASE_URL}/api/dashboard/campaign-sheets?{BERLIN_Q}", timeout=30).json()["sheets"]
    gids = {s["gid"] for s in b}
    assert {"2139819490", "1551110032"} <= gids
    for s in b:
        assert not s.get("online_branch_column") and not s.get("online_branch_fixed")
