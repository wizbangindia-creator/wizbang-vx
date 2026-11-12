# Read-only checks for WhatsApp routing (no sends, no lead creation)
import os
import sys
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
AUTH = {"email": "sunilarora@visaxpert.co", "password": "VisaXpert@2024"}

EXPECTED = {
    "ivr": "visaxpert_ivr", "website": "visaxpert_website",
    "jammu": "visaxpert_interested_jammu", "pathankot": "visaxpert_interested_pathankot",
    "ludhiana": "visaxpert_interested_ludhiana", "amritsar": "visaxpert_interested_amritsar",
    "online": "visaxpert_online_counselling", "online_jammu": "online_jammu",
    "online_pathankot": "online_pathankot", "online_amritsar": "online_amritsar",
    "online_ludhiana": "online_ludhiana", "berlin": "vx_counselling_final",
}


# GET wa-routes returns configured templates
def test_get_wa_routes():
    r = requests.get(f"{BASE_URL}/api/dashboard/wa-routes", params=AUTH, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["templates"] == EXPECTED
    assert data["send_name_param"] is True


def test_get_wa_routes_bad_password():
    r = requests.get(f"{BASE_URL}/api/dashboard/wa-routes",
                     params={"email": AUTH["email"], "password": "wrong"}, timeout=20)
    assert r.status_code == 401


# Pure-function routing key mapping
def test_branch_route_key():
    from server import _branch_route_key as k
    assert k("Online") == "online"
    assert k("Online", "Pathankot") == "online_pathankot"
    assert k("Online - Ludhiana") == "online_ludhiana"
    assert k("Online", "Jammu") == "online_jammu"
    assert k("Online", "Amritsar") == "online_amritsar"
    assert k("Jammu") == "jammu"
    assert k("Amritsar Office") == "amritsar"
    assert k("Mumbai") is None
    assert k("") is None
