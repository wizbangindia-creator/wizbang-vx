# Campaign Leads: send-skipped endpoint + skipped_count (live preview, safe: only acts when 0 real skipped rows)
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
SUNIL = {"email": "sunilarora@visaxpert.co", "password": "VisaXpert@2024"}
NAVYA = {"email": "navyaarora@visaxpert.co", "password": "VisaXpert@2024"}


def _list(creds):
    return requests.get(f"{BASE_URL}/api/dashboard/campaign-leads", params=creds, timeout=20)


def test_list_has_skipped_count():
    r = _list(SUNIL)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d["skipped_count"], int)
    assert d["account"] == "india"


def test_send_skipped_bad_password():
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-leads/send-skipped",
                      params={"email": SUNIL["email"], "password": "wrong"}, timeout=20)
    assert r.status_code in (401, 403)


def test_send_skipped_berlin_user_isolated():
    # navya = berlin account; must never touch india rows
    if _list(NAVYA).json()["skipped_count"] != 0:
        pytest.skip("Real berlin skipped rows exist - not calling live send")
    before = _list(SUNIL).json()["skipped_count"]
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-leads/send-skipped", params=NAVYA, timeout=20)
    assert r.status_code == 200
    assert r.json() == {"success": True, "queued": 0}
    assert _list(SUNIL).json()["skipped_count"] == before


def test_send_skipped_zero_rows():
    # Safety: only call when there are no real skipped rows (live AiSensy key)
    if _list(SUNIL).json()["skipped_count"] != 0:
        pytest.skip("Real skipped rows exist - not calling live send")
    r = requests.post(f"{BASE_URL}/api/dashboard/campaign-leads/send-skipped", params=SUNIL, timeout=20)
    assert r.status_code == 200
    assert r.json() == {"success": True, "queued": 0}
