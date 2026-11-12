# Team members & Student testimonials (profiles) API tests
import io
import os
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
AUTH = {"email": "admin@visaxpert.com", "password": "VisaXpert@2024"}


def _jpg():
    buf = io.BytesIO()
    Image.new("RGB", (40, 40), (30, 80, 200)).save(buf, "JPEG")
    return buf.getvalue()


CREATED = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    for kind, pid in CREATED:
        requests.delete(f"{BASE_URL}/api/dashboard/profiles/{kind}/{pid}", params=AUTH)


def _create(kind, data):
    r = requests.post(f"{BASE_URL}/api/dashboard/profiles/{kind}", params=AUTH,
                      files={"file": ("t.jpg", _jpg(), "image/jpeg")}, data=data)
    if r.status_code == 200:
        CREATED.append((kind, r.json()["profile_id"]))
    return r


# Create + public list/detail + toggle + delete flow
@pytest.mark.parametrize("kind,data", [
    ("team", {"name": "TEST_Member", "designation": "TEST Counsellor"}),
    ("testimonials", {"name": "TEST_Student", "country": "Germany", "review": "TEST great experience"}),
])
def test_full_crud(kind, data):
    r = _create(kind, data)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == data["name"] and d["is_active"] is True
    assert "_id" not in d and d["image_url"]
    pid = d["profile_id"]
    # image fetchable
    img = requests.get(f"{BASE_URL}{d['image_url']}" if d["image_url"].startswith("/") else d["image_url"])
    assert img.status_code == 200
    # public list + detail
    lst = requests.get(f"{BASE_URL}/api/profiles/{kind}").json()["items"]
    assert any(i["profile_id"] == pid for i in lst)
    det = requests.get(f"{BASE_URL}/api/profiles/{kind}/{pid}")
    assert det.status_code == 200 and det.json()["name"] == data["name"]
    # toggle hide
    t = requests.patch(f"{BASE_URL}/api/dashboard/profiles/{kind}/{pid}/toggle", params=AUTH)
    assert t.status_code == 200 and t.json()["is_active"] is False
    assert requests.get(f"{BASE_URL}/api/profiles/{kind}/{pid}").status_code == 404
    lst = requests.get(f"{BASE_URL}/api/profiles/{kind}").json()["items"]
    assert not any(i["profile_id"] == pid for i in lst)
    adm = requests.get(f"{BASE_URL}/api/dashboard/profiles/{kind}", params=AUTH).json()["items"]
    assert any(i["profile_id"] == pid and i["is_active"] is False for i in adm)
    # toggle show
    t = requests.patch(f"{BASE_URL}/api/dashboard/profiles/{kind}/{pid}/toggle", params=AUTH)
    assert t.json()["is_active"] is True
    # delete
    dl = requests.delete(f"{BASE_URL}/api/dashboard/profiles/{kind}/{pid}", params=AUTH)
    assert dl.status_code == 200
    CREATED.remove((kind, pid))
    assert requests.get(f"{BASE_URL}/api/profiles/{kind}/{pid}").status_code == 404
    assert requests.delete(f"{BASE_URL}/api/dashboard/profiles/{kind}/{pid}", params=AUTH).status_code == 404


def test_missing_fields_422():
    r = _create("testimonials", {"name": "TEST_X", "country": "Germany"})
    assert r.status_code == 422


def test_bad_file_type_400():
    r = requests.post(f"{BASE_URL}/api/dashboard/profiles/team", params=AUTH,
                      files={"file": ("t.txt", b"hello", "text/plain")}, data={"name": "TEST", "designation": "x"})
    assert r.status_code == 400


def test_unknown_kind_404():
    assert requests.get(f"{BASE_URL}/api/profiles/bogus").status_code == 404


def test_bad_auth_rejected():
    r = requests.get(f"{BASE_URL}/api/dashboard/profiles/team", params={"email": AUTH["email"], "password": "wrong"})
    assert r.status_code in (401, 403)
    r = requests.post(f"{BASE_URL}/api/dashboard/profiles/team", params={"email": AUTH["email"], "password": "wrong"},
                      files={"file": ("t.jpg", _jpg(), "image/jpeg")}, data={"name": "TEST", "designation": "x"})
    assert r.status_code in (401, 403)
