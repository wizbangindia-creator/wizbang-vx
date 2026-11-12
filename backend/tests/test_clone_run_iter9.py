# Iter9: post-clone verification - health, dashboard auth (3 users + invalid), scoped access, leads filters, public endpoints. No lead creation (live WA/email).
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
PW = "VisaXpert@2024"
ADMIN = {"email": "admin@visaxpert.com", "password": PW}
SUNIL = {"email": "sunilarora@visaxpert.co", "password": PW}
NAVYA = {"email": "navyaarora@visaxpert.co", "password": PW}


# Health
def test_health():
    r = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["database"] == "connected"
    print("sheets_configured:", d.get("sheets_configured"))


# Auth
@pytest.mark.parametrize("creds,access", [(ADMIN, "all"), (SUNIL, "main_landing"), (NAVYA, "university_change")])
def test_login_users(creds, access):
    r = requests.post(f"{BASE_URL}/api/dashboard/login", json=creds, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["success"] is True and isinstance(d["token"], str) and d["token"]
    assert d["user"]["access"] == access, d


@pytest.mark.parametrize("creds", [
    {"email": "admin@visaxpert.com", "password": "wrong"},
    {"email": "nobody@visaxpert.com", "password": PW},
])
def test_login_invalid(creds):
    r = requests.post(f"{BASE_URL}/api/dashboard/login", json=creds, timeout=15)
    assert r.status_code == 401


def test_leads_unauth_rejected():
    r = requests.get(f"{BASE_URL}/api/dashboard/leads", params={"email": "admin@visaxpert.com", "password": "x"}, timeout=15)
    assert r.status_code == 401


# Scoped access
def test_navya_only_uc_leads():
    r = requests.get(f"{BASE_URL}/api/dashboard/leads", params={**NAVYA, "per_page": 100}, timeout=15)
    assert r.status_code == 200
    for l in r.json()["leads"]:
        assert l["source"] == "university_change", l["source"]


def test_sunil_no_uc_leads():
    r = requests.get(f"{BASE_URL}/api/dashboard/leads", params={**SUNIL, "per_page": 100}, timeout=15)
    assert r.status_code == 200
    for l in r.json()["leads"]:
        assert l["source"] != "university_change"


@pytest.mark.parametrize("creds", [ADMIN, SUNIL, NAVYA])
def test_stats(creds):
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", params=creds, timeout=15)
    assert r.status_code == 200, r.text
    assert isinstance(r.json()["total_leads"], int)


# Filters
def test_leads_filters_admin():
    r = requests.get(f"{BASE_URL}/api/dashboard/leads", params={**ADMIN, "source": "website", "status": "new"}, timeout=15)
    assert r.status_code == 200
    for l in r.json()["leads"]:
        assert l["source"] == "website" and l["status"] == "new"
    r2 = requests.get(f"{BASE_URL}/api/dashboard/leads", params={**ADMIN, "search": "zzzz_no_match_qq"}, timeout=15)
    assert r2.status_code == 200 and r2.json()["total"] == 0


# Campaign leads
@pytest.mark.parametrize("creds", [ADMIN, SUNIL, NAVYA])
def test_campaign_leads(creds):
    r = requests.get(f"{BASE_URL}/api/dashboard/campaign-leads", params=creds, timeout=20)
    print(creds["email"], r.status_code, r.text[:200])
    assert r.status_code in (200, 403), r.text


# Public endpoints
def test_public_endpoints():
    for ep in ("", "reviews", "partner-logos", "success-stories", "page-logos", "uc-appointment-toggle", "uc-bookings/days?month=2026-02"):
        r = requests.get(f"{BASE_URL}/api/{ep}", timeout=15)
        assert r.status_code == 200, f"{ep}: {r.status_code} {r.text[:200]}"
