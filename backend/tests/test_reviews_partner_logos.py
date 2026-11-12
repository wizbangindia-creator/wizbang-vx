"""
Tests for Reviews & Partner Logos endpoints.
- Reviews: create per-page, fetch by page, toggle, delete, dashboard list
- Partner Logos: upload (multipart), filter by page, hide via toggle, delete,
  validation errors (size, content-type, invalid page key)
- Auth: dashboard endpoints require valid email/password query params
"""
import io
import os
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
ADMIN_EMAIL = "admin@visaxpert.com"
ADMIN_PASSWORD = "VisaXpert@2024"
AUTH = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}


# ----- Helpers -----
def _png_bytes(width: int = 1, height: int = 1) -> bytes:
    """Build a tiny valid PNG in-memory (no Pillow needed)."""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr = b"IHDR" + ihdr_data
    ihdr_chunk = struct.pack(">I", len(ihdr_data)) + ihdr + struct.pack(">I", zlib.crc32(ihdr) & 0xffffffff)
    raw = b"\x00" + b"\x00\x00\x00" * width  # 1 row of black RGB pixel
    rows = raw * height
    comp = zlib.compress(rows)
    idat = b"IDAT" + comp
    idat_chunk = struct.pack(">I", len(comp)) + idat + struct.pack(">I", zlib.crc32(idat) & 0xffffffff)
    iend = b"IEND"
    iend_chunk = struct.pack(">I", 0) + iend + struct.pack(">I", zlib.crc32(iend) & 0xffffffff)
    return sig + ihdr_chunk + idat_chunk + iend_chunk


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


# ==================== REVIEWS ====================
class TestReviews:
    created_ids = []

    def test_create_review_main(self, session):
        payload = {
            "name": "TEST Reviewer Main",
            "country": "Germany",
            "content": "Excellent service from VisaXpert team, highly recommended.",
            "rating": 5,
            "page": "main",
        }
        r = session.post(f"{BASE_URL}/api/dashboard/reviews", params=AUTH, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert "review_id" in data
        TestReviews.created_ids.append(data["review_id"])

    def test_create_review_university_change(self, session):
        payload = {
            "name": "TEST Reviewer UC",
            "country": "France",
            "content": "University change went smoothly with their guidance.",
            "rating": 4,
            "page": "university_change",
        }
        r = session.post(f"{BASE_URL}/api/dashboard/reviews", params=AUTH, json=payload)
        assert r.status_code == 200, r.text
        TestReviews.created_ids.append(r.json()["review_id"])

    def test_create_review_germany_fair(self, session):
        payload = {
            "name": "TEST Reviewer GF",
            "country": "Germany",
            "content": "Germany Fair was extremely informative and useful.",
            "rating": 5,
            "page": "germany_fair",
        }
        r = session.post(f"{BASE_URL}/api/dashboard/reviews", params=AUTH, json=payload)
        assert r.status_code == 200, r.text
        TestReviews.created_ids.append(r.json()["review_id"])

    def test_public_reviews_filtered_by_page(self, session):
        for pg in ["main", "university_change", "germany_fair"]:
            r = session.get(f"{BASE_URL}/api/reviews", params={"page": pg})
            assert r.status_code == 200, r.text
            data = r.json()
            assert "reviews" in data and "total" in data
            assert all(rev["page"] == pg for rev in data["reviews"]), f"Mixed pages in {pg}: {data}"
            assert data["total"] >= 1, f"Expected at least 1 review for page {pg}"

    def test_dashboard_reviews_lists_all(self, session):
        r = session.get(f"{BASE_URL}/api/dashboard/reviews", params=AUTH)
        assert r.status_code == 200, r.text
        ids = [rev["review_id"] for rev in r.json()["reviews"]]
        for rid in TestReviews.created_ids:
            assert rid in ids, f"Created review {rid} not in dashboard list"

    def test_dashboard_reviews_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/dashboard/reviews", params={"email": "a@b.com", "password": "wrong"})
        assert r.status_code == 401

    def test_toggle_review_hides_from_public(self, session):
        rid = TestReviews.created_ids[0]
        r = session.patch(f"{BASE_URL}/api/dashboard/reviews/{rid}/toggle", params=AUTH)
        assert r.status_code == 200, r.text
        assert r.json()["is_active"] is False

        pub = session.get(f"{BASE_URL}/api/reviews", params={"page": "main"}).json()
        assert rid not in [x["review_id"] for x in pub["reviews"]]

        # Toggle back to active
        r2 = session.patch(f"{BASE_URL}/api/dashboard/reviews/{rid}/toggle", params=AUTH)
        assert r2.json()["is_active"] is True

    def test_delete_review(self, session):
        # Create a throwaway one to delete
        payload = {
            "name": "TEST Delete Me",
            "country": "India",
            "content": "Throwaway review used only for delete validation.",
            "rating": 3,
            "page": "main",
        }
        rid = session.post(f"{BASE_URL}/api/dashboard/reviews", params=AUTH, json=payload).json()["review_id"]
        r = session.delete(f"{BASE_URL}/api/dashboard/reviews/{rid}", params=AUTH)
        assert r.status_code == 200, r.text
        # Deleting again -> 404
        r2 = session.delete(f"{BASE_URL}/api/dashboard/reviews/{rid}", params=AUTH)
        assert r2.status_code == 404


# ==================== PARTNER LOGOS ====================
class TestPartnerLogos:
    created_ids: list[str] = []

    def test_public_partner_logos_returns_shape(self, session):
        r = session.get(f"{BASE_URL}/api/partner-logos")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "logos" in data and "total" in data
        assert isinstance(data["logos"], list)
        assert isinstance(data["total"], int)

    def test_dashboard_partner_logos_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/dashboard/partner-logos", params={"email": "x@y.z", "password": "no"})
        assert r.status_code == 401

    def test_upload_partner_logo_main_and_germany(self, session):
        png = _png_bytes()
        files = {"file": ("test_logo.png", png, "image/png")}
        data = {"name": "TEST Logo Main+GF", "pages": "main,germany_fair"}
        r = session.post(f"{BASE_URL}/api/dashboard/partner-logos", params=AUTH, files=files, data=data)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert "logo_id" in body and "logo_url" in body
        assert body["logo_url"].startswith("/api/uploads/")
        TestPartnerLogos.created_ids.append(body["logo_id"])

    def test_upload_partner_logo_university_change(self, session):
        png = _png_bytes()
        files = {"file": ("uc_logo.png", png, "image/png")}
        data = {"name": "TEST Logo UC", "pages": "university_change"}
        r = session.post(f"{BASE_URL}/api/dashboard/partner-logos", params=AUTH, files=files, data=data)
        assert r.status_code == 200, r.text
        TestPartnerLogos.created_ids.append(r.json()["logo_id"])

    def test_filter_by_page(self, session):
        r_main = session.get(f"{BASE_URL}/api/partner-logos", params={"page": "main"}).json()
        r_gf = session.get(f"{BASE_URL}/api/partner-logos", params={"page": "germany_fair"}).json()
        r_uc = session.get(f"{BASE_URL}/api/partner-logos", params={"page": "university_change"}).json()

        # Logo 0 is in main+germany_fair, should appear in both
        first_id = TestPartnerLogos.created_ids[0]
        assert first_id in [x["logo_id"] for x in r_main["logos"]]
        assert first_id in [x["logo_id"] for x in r_gf["logos"]]
        assert first_id not in [x["logo_id"] for x in r_uc["logos"]]

        # Logo 1 is only in university_change
        second_id = TestPartnerLogos.created_ids[1]
        assert second_id in [x["logo_id"] for x in r_uc["logos"]]
        assert second_id not in [x["logo_id"] for x in r_main["logos"]]

    def test_pages_field_is_a_list(self, session):
        r = session.get(f"{BASE_URL}/api/dashboard/partner-logos", params=AUTH).json()
        target = next(x for x in r["logos"] if x["logo_id"] == TestPartnerLogos.created_ids[0])
        assert isinstance(target["pages"], list)
        assert "main" in target["pages"] and "germany_fair" in target["pages"]

    def test_toggle_hides_from_public_but_visible_to_dashboard(self, session):
        lid = TestPartnerLogos.created_ids[0]
        r = session.patch(f"{BASE_URL}/api/dashboard/partner-logos/{lid}/toggle", params=AUTH)
        assert r.status_code == 200
        assert r.json()["is_active"] is False

        pub = session.get(f"{BASE_URL}/api/partner-logos", params={"page": "main"}).json()
        assert lid not in [x["logo_id"] for x in pub["logos"]], "Hidden logo should not appear in public list"

        adm = session.get(f"{BASE_URL}/api/dashboard/partner-logos", params=AUTH).json()
        assert lid in [x["logo_id"] for x in adm["logos"]], "Hidden logo should still be visible to admin"

        # Toggle back
        session.patch(f"{BASE_URL}/api/dashboard/partner-logos/{lid}/toggle", params=AUTH)

    def test_reject_invalid_page(self, session):
        png = _png_bytes()
        files = {"file": ("bad.png", png, "image/png")}
        data = {"name": "TEST Bad Page", "pages": "main,not_a_real_page"}
        r = session.post(f"{BASE_URL}/api/dashboard/partner-logos", params=AUTH, files=files, data=data)
        assert r.status_code == 400, r.text

    def test_reject_non_image(self, session):
        files = {"file": ("doc.txt", b"hello world", "text/plain")}
        data = {"name": "TEST Non Image", "pages": "main"}
        r = session.post(f"{BASE_URL}/api/dashboard/partner-logos", params=AUTH, files=files, data=data)
        assert r.status_code == 400, r.text

    def test_reject_oversize(self, session):
        big = b"\x89PNG\r\n\x1a\n" + b"A" * (3 * 1024 * 1024 + 10)
        files = {"file": ("huge.png", big, "image/png")}
        data = {"name": "TEST Oversize", "pages": "main"}
        r = session.post(f"{BASE_URL}/api/dashboard/partner-logos", params=AUTH, files=files, data=data)
        assert r.status_code == 400, r.text

    def test_delete_partner_logo(self, session):
        # create a throwaway one to delete
        png = _png_bytes()
        files = {"file": ("temp.png", png, "image/png")}
        data = {"name": "TEST Throwaway", "pages": "main"}
        lid = session.post(f"{BASE_URL}/api/dashboard/partner-logos", params=AUTH, files=files, data=data).json()["logo_id"]

        r = session.delete(f"{BASE_URL}/api/dashboard/partner-logos/{lid}", params=AUTH)
        assert r.status_code == 200, r.text

        r2 = session.delete(f"{BASE_URL}/api/dashboard/partner-logos/{lid}", params=AUTH)
        assert r2.status_code == 404
