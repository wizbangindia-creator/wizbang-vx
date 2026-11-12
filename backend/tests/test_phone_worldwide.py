# Unit tests (iteration_13): country-aware _format_phone via phonenumbers for worldwide numbers. No network.
import asyncio
import sys
import pytest

sys.path.insert(0, "/app/backend")
import server  # noqa: E402


# International numbers (+ / 00) keep own country code; trunk 0 dropped where the country uses one
WORLD = [
    ("+33 06 12 34 56 78", "33612345678"),      # France trunk 0 dropped
    ("0033 6 12 34 56 78", "33612345678"),
    ("+39 06 1234 5678", "390612345678"),       # Italy keeps 0
    ("+39 333 123 4567", "393331234567"),
    ("+55 11 91234 5678", "5511912345678"),     # Brazil
    ("+234 0803 123 4567", "2348031234567"),    # Nigeria trunk 0 dropped
    ("+234 803 123 4567", "2348031234567"),
    ("+61 0412 345 678", "61412345678"),        # Australia trunk 0 dropped
    ("+61 412 345 678", "61412345678"),
    ("+254 0712 345678", "254712345678"),       # Kenya
    ("+254 712 345678", "254712345678"),
    ("+20 010 1234 5678", "201012345678"),      # Egypt
    ("+20 10 1234 5678", "201012345678"),
    ("+1 (415) 555-2671", "14155552671"),       # US
    ("+44 07700 900123", "447700900123"),       # UK trunk 0
    ("+44 7700 900123", "447700900123"),
    ("+971 050 123 4567", "971501234567"),      # UAE trunk 0
    ("+971 50 123 4567", "971501234567"),
    ("+356 9912 3456", "35699123456"),          # Malta
    ("+370 612 34567", "37061234567"),          # Lithuania
    ("00370 612 34567", "37061234567"),
    ("+371 2783 1710", "37127831710"),          # Latvia
    ("+92 0300 1234567", "923001234567"),       # Pakistan trunk 0
    ("+92 300 1234567", "923001234567"),
    ("+880 01712 345678", "8801712345678"),     # Bangladesh trunk 0
    ("+880 1712 345678", "8801712345678"),
    ("+977 980 1234567", "9779801234567"),      # Nepal
    ("+49 0176 1234567", "491761234567"),       # Germany trunk 0
    ("+91 098765 43210", "919876543210"),       # India trunk 0
    ("p:+96894296116", "96894296116"),          # Oman with p: prefix
    ("\u202a+33 6 12 34 56 78\u202c", "33612345678"),  # bidi chars
]


@pytest.mark.parametrize("raw,expected", WORLD)
@pytest.mark.parametrize("cc", ["49", "91"])
def test_format_phone_world(raw, expected, cc):
    assert server._format_phone(raw, cc) == expected


# Bare local numbers use default_cc
@pytest.mark.parametrize("raw,cc,expected", [
    ("0176 1234567", "49", "491761234567"),
    ("p:017684567118", "49", "4917684567118"),
    ("17661528137", "49", "4917661528137"),
    ("9876543210", "91", "919876543210"),
    ("09876543210", "91", "919876543210"),
    ("919876543210", "91", "919876543210"),
])
def test_format_phone_bare(raw, cc, expected):
    assert server._format_phone(raw, cc) == expected


# _clean_phone berlin returns +intl
@pytest.mark.parametrize("raw,expected", [(r, "+" + e) for r, e in WORLD] + [
    ("0176 1234567", "+491761234567"),
])
def test_clean_phone_berlin_world(raw, expected):
    assert server._clean_phone(raw, "berlin") == expected


@pytest.mark.parametrize("raw", ["p:99856137", "99572336", "12345", ""])
def test_clean_phone_berlin_short_bare(raw):
    assert server._clean_phone(raw, "berlin") == ""


# India path unchanged
@pytest.mark.parametrize("raw,expected", [
    ("9876543210", "9876543210"),
    ("+91 98765 43210", "9876543210"),
    ("09876543210", "9876543210"),
    ("919876543210", "9876543210"),
    ("+65 9123 4567", "+6591234567"),
    ("+33 06 12 34 56 78", "+33612345678"),
])
def test_clean_phone_india(raw, expected):
    assert server._clean_phone(raw) == expected


class _FakeResp:
    status_code = 200
    text = "{}"

    def json(self):
        return {"ok": True}


# Berlin key -> default 49; India key -> 91 (httpx monkeypatched)
@pytest.mark.parametrize("phone,use_uc,expected", [
    ("0176 1234567", True, "491761234567"),
    ("+33 06 12 34 56 78", True, "33612345678"),
    ("+234 0803 123 4567", True, "2348031234567"),
    ("9876543210", False, "919876543210"),
    ("+61 0412 345 678", False, "61412345678"),
])
def test_send_via_aisensy_world(monkeypatch, phone, use_uc, expected):
    captured = {}

    async def fake_post(self, url, json=None, headers=None, timeout=None, **kw):
        captured["payload"] = json
        return _FakeResp()

    monkeypatch.setattr(server.httpx.AsyncClient, "post", fake_post)
    if not use_uc:
        monkeypatch.setattr(server, "AISENSY_API_KEY", "TEST_INDIA_KEY")
    res = asyncio.new_event_loop().run_until_complete(server._send_via_aisensy(
        phone, "TEST_campaign", "en", [], None,
        api_key_override=server.AISENSY_API_KEY_UC if use_uc else None))
    assert res["ok"] is True
    assert captured["payload"]["destination"] == expected
