import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import server  # noqa: E402

CSV = """name,phone,branch
A,9800011111,Jammu
B,9800022222,Online
C,9800033333,Berlin office
D,,Jammu
"""
sent = []


async def fake_fetch(url):
    return CSV


async def fake_send(**kw):
    sent.append((kw["to_phone"], kw["template_name"]))
    return {"ok": True}


async def main():
    await server.startup_db_client()
    server.db = server.db.client["send_skipped_test_tmp"]
    server.fetch_google_sheet_csv = fake_fetch
    server._send_whatsapp_api = fake_send
    cols = [{"heading": "Name", "sheet_column": "name"}, {"heading": "Phone", "sheet_column": "phone"},
            {"heading": "Branch", "sheet_column": "branch"}] + [{"heading": f"C{i}", "sheet_column": ""} for i in range(5)]
    await server.db.settings.insert_one({"type": "campaign_sheet", "sheet_url": "x", "name_col": 0, "phone_col": 1, "branch_col": 2, "columns": cols})
    r = await server._do_campaign_sheet_sync()
    assert r["imported"] == 4 and not sent
    listing = await server.list_campaign_leads(email="sunilarora@visaxpert.co", password="VisaXpert@2024", page=1, per_page=20, search="", branch="")
    assert listing["skipped_count"] == 3, listing["skipped_count"]
    res = await server.send_skipped_campaign_leads(email="sunilarora@visaxpert.co", password="VisaXpert@2024")
    assert res["queued"] == 3
    await asyncio.sleep(2.5)
    print(sent)
    assert ("9800011111", "visaxpert_interested_jammu") in sent
    assert ("9800022222", "visaxpert_online_counselling") in sent
    assert len(sent) == 2
    statuses = sorted([d["whatsapp"]["status"] async for d in server.db.campaign_leads.find({"phone": {"$ne": ""}})])
    assert statuses == ["failed", "sent", "sent"], statuses
    berlin = await server.list_campaign_leads(email="navyaarora@visaxpert.co", password="VisaXpert@2024", page=1, per_page=20, search="", branch="")
    assert berlin["skipped_count"] == 0
    await server.db.client.drop_database("send_skipped_test_tmp")
    print("OK")


asyncio.run(main())
