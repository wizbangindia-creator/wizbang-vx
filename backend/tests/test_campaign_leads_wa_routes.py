# Iteration 2: Campaign Leads tab, WA routes, access control, website/IVR lead WhatsApp routing
import os
import time
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
SUNIL = {"email": "sunilarora@visaxpert.co", "password": "VisaXpert@2024"}
NAVYA = {"email": "navyaarora@visaxpert.co", "password": "VisaXpert@2024"}
ADMIN = {"email": "admin@visaxpert.com", "password": "VisaXpert@2024"}
DEFAULT_ROUTES = {
    "ivr": "visaxpert_ivr",
    "website": "visaxpert_website",
    "jammu": "visaxpert_interested_jammu",
    "pathankot": "visaxpert_interested_pathankot",
    "ludhiana": "visaxpert_interested_ludhiana",
    "amritsar": "visaxpert_interested_amritsar",
    "online": "visaxpert_online_counselling",
}
HEADINGS = ["Date", "Name", "Phone", "Email", "City", "Preferred Branch", "Country", "Campaign"]


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# --- WA routes ---
class TestWaRoutes:
    def test_get_defaults(self, s):
        r = s.get(f"{API}/dashboard/wa-routes", params=SUNIL)
        assert r.status_code == 200
        d = r.json()
        for k, v in DEFAULT_ROUTES.items():
            assert d["templates"][k] == v
        assert "send_name_param" in d

    def test_save_and_reset(self, s):
        t = dict(DEFAULT_ROUTES, website="TEST_website_tpl")
        r = s.post(f"{API}/dashboard/wa-routes", params=SUNIL, json={"templates": t, "send_name_param": True})
        assert r.status_code == 200
        assert r.json()["templates"]["website"] == "TEST_website_tpl"
        g = s.get(f"{API}/dashboard/wa-routes", params=SUNIL).json()
        assert g["templates"]["website"] == "TEST_website_tpl"
        # reset
        r = s.post(f"{API}/dashboard/wa-routes", params=SUNIL, json={"templates": DEFAULT_ROUTES, "send_name_param": True})
        assert r.json()["templates"] == DEFAULT_ROUTES

    def test_navya_forbidden(self, s):
        assert s.get(f"{API}/dashboard/wa-routes", params=NAVYA).status_code == 403

    def test_bad_password(self, s):
        r = s.get(f"{API}/dashboard/wa-routes", params={"email": SUNIL["email"], "password": "x"})
        assert r.status_code == 401


# --- Campaign sheet settings / leads ---
class TestCampaignSheet:
    def test_get_settings_default(self, s):
        r = s.get(f"{API}/dashboard/campaign-sheet/settings", params=SUNIL)
        assert r.status_code == 200
        d = r.json()
        assert len(d["columns"]) == 8

    def test_save_8_columns(self, s):
        prev = s.get(f"{API}/dashboard/campaign-sheet/settings", params=SUNIL).json()
        cols = [{"heading": f"TEST_{h}", "sheet_column": h.lower()} for h in HEADINGS]
        payload = {"sheet_url": "https://docs.google.com/spreadsheets/d/TEST_fake/edit", "columns": cols,
                   "phone_col": 2, "name_col": 1, "branch_col": 5, "auto_sync_enabled": False,
                   "sync_interval_minutes": 15}
        r = s.post(f"{API}/dashboard/campaign-sheet/settings", params=SUNIL, json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["configured"] is True
        assert d["columns"][0]["heading"] == "TEST_Date"
        lst = s.get(f"{API}/dashboard/campaign-leads", params=SUNIL).json()
        assert lst["headings"][0] == "TEST_Date"
        # restore: set headings back to defaults and empty url
        restore = {"sheet_url": prev.get("sheet_url", ""),
                   "columns": prev["columns"] if len(prev["columns"]) == 8 else [{"heading": h, "sheet_column": ""} for h in HEADINGS],
                   "phone_col": prev["phone_col"], "name_col": prev["name_col"], "branch_col": prev["branch_col"],
                   "auto_sync_enabled": prev["auto_sync_enabled"], "sync_interval_minutes": prev["sync_interval_minutes"]}
        r2 = s.post(f"{API}/dashboard/campaign-sheet/settings", params=SUNIL, json=restore)
        assert r2.status_code == 200

    def test_save_7_columns_422(self, s):
        cols = [{"heading": h, "sheet_column": h} for h in HEADINGS[:7]]
        r = s.post(f"{API}/dashboard/campaign-sheet/settings", params=SUNIL,
                   json={"sheet_url": "x", "columns": cols})
        assert r.status_code == 422

    def test_invalid_col_index_422(self, s):
        cols = [{"heading": h, "sheet_column": h} for h in HEADINGS]
        r = s.post(f"{API}/dashboard/campaign-sheet/settings", params=SUNIL,
                   json={"sheet_url": "x", "columns": cols, "phone_col": 9})
        assert r.status_code == 422

    def test_list_campaign_leads(self, s):
        r = s.get(f"{API}/dashboard/campaign-leads", params=SUNIL)
        assert r.status_code == 200
        d = r.json()
        assert len(d["headings"]) == 8
        assert isinstance(d["items"], list)

    def test_navya_403(self, s):
        assert s.get(f"{API}/dashboard/campaign-leads", params=NAVYA).status_code == 403
        assert s.get(f"{API}/dashboard/campaign-sheet/settings", params=NAVYA).status_code == 403

    def test_admin_ok(self, s):
        assert s.get(f"{API}/dashboard/campaign-leads", params=ADMIN).status_code == 200

    def test_resend_delete_404(self, s):
        assert s.post(f"{API}/dashboard/campaign-leads/nonexistent/resend", params=SUNIL).status_code == 404
        assert s.delete(f"{API}/dashboard/campaign-leads/nonexistent", params=SUNIL).status_code == 404


# --- Website + IVR leads with WhatsApp routing (fake 99999000xx numbers) ---
class TestLeadRouting:
    created = {}

    def test_website_lead(self, s):
        r = s.post(f"{API}/webhook/lead", json={"name": "TEST_Website", "phone": "9999900001",
                                                 "email": "test_web@example.com", "source": "homepage"})
        assert r.status_code == 200, r.text
        TestLeadRouting.created["web"] = r.json().get("lead_id")
        assert TestLeadRouting.created["web"]

    def test_ivr_lead(self, s):
        r = s.get(f"{API}/webhook/ivr", params={"SourceNumber": "9999900002", "Status": "Answered"})
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True
        TestLeadRouting.created["ivr"] = r.json().get("lead_id")

    def test_leads_visible_for_sunil(self, s):
        time.sleep(4)
        r = s.get(f"{API}/dashboard/leads", params={**SUNIL, "search": "99999000"})
        assert r.status_code == 200
        data = r.json()
        items = data.get("leads") or data.get("items") or []
        phones = [l.get("phone") for l in items]
        print("sunil leads phones", phones, [l.get("whatsapp") for l in items])
        assert any("9999900001" in (p or "") for p in phones)
        assert any("9999900002" in (p or "") for p in phones)

    def test_backend_log_routing(self):
        out = subprocess.run("tail -n 400 /var/log/supervisor/backend.err.log /var/log/supervisor/backend.out.log 2>/dev/null",
                             shell=True, capture_output=True, text=True).stdout
        assert "Routed WhatsApp [website] 'visaxpert_website' to 9999900001" in out
        assert "Routed WhatsApp [ivr] 'visaxpert_ivr' to 9999900002" in out
