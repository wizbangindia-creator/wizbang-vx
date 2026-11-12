import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import server  # noqa: E402

CSV = """created_time,full_name,phone_number,email,city,preferred_branch,online_branch,campaign_name
2026-06-01,Aman,+91 98000 11111,a@x.com,Jammu,Jammu,,CampA
2026-06-01,Riya,9800022222,r@x.com,Amritsar,Amritsar Office,,CampA
2026-06-01,Karan,9800033333,k@x.com,Delhi,Online,,CampB
2026-06-01,Nobody,9800044444,n@x.com,Delhi,Mumbai,,CampB
2026-06-01,Simran,9800055555,s@x.com,Delhi,Online,Pathankot,CampB
2026-06-01,Veer,9800066666,v@x.com,Delhi,Online - Ludhiana,,CampB
"""
sent = []


async def fake_fetch(url):
    return CSV


async def fake_send(**kw):
    sent.append((kw["to_phone"], kw["template_name"], kw["body_params"]))
    return {"ok": True}


async def main():
    await server.startup_db_client()
    server.db = server.db.client["campaign_test_tmp"]
    await server.db.campaign_leads.delete_many({})
    await server.db.settings.delete_many({})
    server.fetch_google_sheet_csv = fake_fetch
    server._send_whatsapp_api = fake_send
    cols = ["created_time", "full_name", "phone_number", "email", "city", "preferred_branch", "online_branch", "campaign_name"]
    await server.db.settings.insert_one({"type": "campaign_sheet", "sheet_url": "x", "phone_col": 2, "name_col": 1, "branch_col": 5, "online_branch_col": 6,
                                         "columns": [{"heading": c, "sheet_column": c} for c in cols]})
    r1 = await server._do_campaign_sheet_sync(send_to_existing=True)
    await asyncio.sleep(0.5)
    print("first", r1, sent)
    assert r1["imported"] == 6 and len(sent) == 5
    assert ("9800055555", "online_pathankot", ["Simran"]) in sent
    assert ("9800066666", "online_ludhiana", ["Veer"]) in sent
    assert ("9800011111", "visaxpert_interested_jammu", ["Aman"]) in sent
    assert ("9800022222", "visaxpert_interested_amritsar", ["Riya"]) in sent
    assert ("9800033333", "visaxpert_online_counselling", ["Karan"]) in sent
    r2 = await server._do_campaign_sheet_sync()
    print("second", r2)
    assert r2["imported"] == 0
    nob = await server.db.campaign_leads.find_one({"phone": "9800044444"})
    assert nob["whatsapp"]["status"] == "failed", nob
    sent.clear()
    await server.db.settings.insert_one({"type": "campaign_sheet_berlin", "sheet_url": "x", "phone_col": 2, "name_col": 1, "branch_col": 5,
                                         "columns": [{"heading": c, "sheet_column": c} for c in cols]})
    r3 = await server._do_campaign_sheet_sync(send_to_existing=True, account="berlin")
    await asyncio.sleep(0.5)
    print("berlin", r3, sent)
    assert r3["imported"] == 6 and len(sent) == 6
    assert all(t == "vx_counselling_final" for _, t, _ in sent)
    assert await server.db.campaign_leads.count_documents({"account": "berlin"}) == 6
    await server.db.client.drop_database("campaign_test_tmp")
    print("OK")


asyncio.run(main())
