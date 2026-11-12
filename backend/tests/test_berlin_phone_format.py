# Unit tests: international phone formatting for Berlin (49) vs India (91) AiSensy accounts. No network.
import asyncio
import sys
import pytest

sys.path.insert(0, "/app/backend")
import server  # noqa: E402


# _format_phone: international numbers keep their own country code
@pytest.mark.parametrize("raw,cc,expected", [
    ("p:+35699123456", "49", "35699123456"),
    ("00370 612 34567", "49", "37061234567"),
    ("p:+96894296116", "49", "96894296116"),
    ("+49 0176 1234567", "49", "491761234567"),
    ("\u202a+35699123456\u202c", "49", "35699123456"),
    ("p:\u202a+49 176 84567118\u202c", "49", "4917684567118"),
    ("+919876543210", "49", "919876543210"),
    ("+91 98765 43210", "91", "919876543210"),
    ("p:+35699123456", "91", "35699123456"),
    ("00370 612 34567", "91", "37061234567"),
    ("+1 415 555 2671", "49", "14155552671"),
    ("+44 7700 900123", "49", "447700900123"),
    ("+971 50 123 4567", "49", "971501234567"),
])
def test_format_phone_international(raw, cc, expected):
    assert server._format_phone(raw, cc) == expected


# _format_phone: bare local numbers use default_cc
@pytest.mark.parametrize("raw,cc,expected", [
    ("p:017684567118", "49", "4917684567118"),
    ("17661528137", "49", "4917661528137"),
    ("0176 1234567", "49", "491761234567"),
    ("491761234567", "49", "491761234567"),
    ("9876543210", "91", "919876543210"),
    ("09876543210", "91", "919876543210"),
    ("919876543210", "91", "919876543210"),
])
def test_format_phone_local(raw, cc, expected):
    assert server._format_phone(raw, cc) == expected


# _clean_phone: berlin -> +intl, india -> old 10-digit behaviour
@pytest.mark.parametrize("raw,expected", [
    ("p:+35699123456", "+35699123456"),
    ("00370 612 34567", "+37061234567"),
    ("p:017684567118", "+4917684567118"),
    ("+91 98765 43210", "+919876543210"),
    ("p:+96894296116", "+96894296116"),
    ("", ""),
])
def test_clean_phone_berlin(raw, expected):
    assert server._clean_phone(raw, "berlin") == expected


@pytest.mark.parametrize("raw,expected", [
    ("9876543210", "9876543210"),
    ("+91 98765 43210", "9876543210"),
    ("09876543210", "9876543210"),
])
def test_clean_phone_india(raw, expected):
    assert server._clean_phone(raw) == expected


# _send_via_aisensy picks default cc based on key — httpx post monkeypatched (no network)
class _FakeResp:
    status_code = 200
    text = "{}"

    def json(self):
        return {"ok": True}


@pytest.mark.parametrize("phone,use_uc,expected", [
    ("17661528137", True, "4917661528137"),
    ("+35699123456", True, "35699123456"),
    ("+919876543210", True, "919876543210"),
    ("9876543210", False, "919876543210"),
    ("+35699123456", False, "35699123456"),
])
def test_send_via_aisensy_destination(monkeypatch, phone, use_uc, expected):
    captured = {}

    async def fake_post(self, url, json=None, headers=None, timeout=None):
        captured["payload"] = json
        return _FakeResp()

    monkeypatch.setattr(server.httpx.AsyncClient, "post", fake_post)
    if not use_uc:
        monkeypatch.setattr(server, "AISENSY_API_KEY", "TEST_INDIA_KEY")
    res = asyncio.get_event_loop().run_until_complete(server._send_via_aisensy(
        phone, "TEST_campaign", "en", [], None,
        api_key_override=server.AISENSY_API_KEY_UC if use_uc else None))
    assert res["ok"] is True
    assert captured["payload"]["destination"] == expected


# iteration_12: Berlin bare short numbers (<10 digits, no +/00) -> '' (invalid)
@pytest.mark.parametrize("raw", ["p:99856137", "p:27831710", "p:512805365", "99572336", "p:\u202a99856137\u202c"])
def test_clean_phone_berlin_short_bare_invalid(raw):
    assert server._clean_phone(raw, "berlin") == ""


# Berlin: short numbers WITH +/00 are still kept
@pytest.mark.parametrize("raw,expected", [
    ("+356 9912 3456", "+35699123456"),
    ("00371 2783 1710", "+37127831710"),
    ("p:+37061234567", "+37061234567"),
])
def test_clean_phone_berlin_short_intl_kept(raw, expected):
    assert server._clean_phone(raw, "berlin") == expected


# iteration_12: India keeps non-91 international codes
@pytest.mark.parametrize("raw,expected", [
    ("+65 9123 4567", "+6591234567"),
    ("0065 9123 4567", "+6591234567"),
    ("+971 50 123 4567", "+971501234567"),
    ("+1 415 555 2671", "+14155552671"),
    ("+91 98765 43210", "9876543210"),
    ("p:+919876543210", "9876543210"),
    ("919876543210", "9876543210"),
])
def test_clean_phone_india_intl(raw, expected):
    assert server._clean_phone(raw) == expected


def test_format_phone_india_sg_no_91():
    assert server._format_phone(server._clean_phone("+65 9123 4567")) == "6591234567"
    assert server._format_phone(server._clean_phone("9876543210")) == "919876543210"
