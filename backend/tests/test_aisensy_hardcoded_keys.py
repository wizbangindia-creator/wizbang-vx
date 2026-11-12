# Iteration 7: hardcoded AiSensy keys (no env override) + wa-routes key_hint. Never prints keys.
import os
import sys
import importlib
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
AUTH = {"email": "sunilarora@visaxpert.co", "password": "VisaXpert@2024"}


def _dotenv():
    vals = {}
    with open("/app/backend/.env") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


# Keys literal: match .env and ignore wrong env vars
def test_keys_match_dotenv_and_ignore_env_override():
    env = _dotenv()
    old = {k: os.environ.get(k) for k in ("AISENSY_API_KEY", "AISENSY_API_KEY_UC")}
    os.environ["AISENSY_API_KEY"] = "wrong"
    os.environ["AISENSY_API_KEY_UC"] = "wrong"
    try:
        import server
        server = importlib.reload(server)
        assert server.AISENSY_API_KEY != "wrong"
        assert server.AISENSY_API_KEY_UC != "wrong"
        if "AISENSY_API_KEY" in env:
            assert server.AISENSY_API_KEY == env["AISENSY_API_KEY"], "India key != .env"
        if "AISENSY_API_KEY_UC" in env:
            assert server.AISENSY_API_KEY_UC == env["AISENSY_API_KEY_UC"], "Berlin key != .env"
        assert len(server.AISENSY_API_KEY) > 20 and len(server.AISENSY_API_KEY_UC) > 20
        assert server.AISENSY_API_KEY != server.AISENSY_API_KEY_UC
    finally:
        for k, v in old.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


# GET wa-routes exposes only last-6 hints
def test_wa_routes_key_hint():
    r = requests.get(f"{BASE_URL}/api/dashboard/wa-routes", params=AUTH, timeout=20)
    assert r.status_code == 200
    hint = r.json().get("key_hint")
    assert isinstance(hint, dict) and set(hint) >= {"india", "berlin"}
    env = _dotenv()
    for k, envk in (("india", "AISENSY_API_KEY"), ("berlin", "AISENSY_API_KEY_UC")):
        assert hint[k].startswith("…") and len(hint[k]) == 7
        if envk in env:
            assert hint[k] == "…" + env[envk][-6:]


# POST wa-routes round-trip (saves current values back unchanged)
def test_post_wa_routes_roundtrip():
    cur = requests.get(f"{BASE_URL}/api/dashboard/wa-routes", params=AUTH, timeout=20).json()
    r = requests.post(f"{BASE_URL}/api/dashboard/wa-routes", params=AUTH,
                      json={"templates": cur["templates"], "send_name_param": cur["send_name_param"]}, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d["templates"] == cur["templates"]
    assert d["send_name_param"] == cur["send_name_param"]
    assert "key_hint" in d


def test_wa_routes_unauthorized():
    r = requests.get(f"{BASE_URL}/api/dashboard/wa-routes",
                     params={"email": AUTH["email"], "password": "bad"}, timeout=20)
    assert r.status_code == 401
