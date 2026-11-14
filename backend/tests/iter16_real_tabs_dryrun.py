# Dry-run: import real EU/NON-EU tabs into a temp DB (no sends) and summarise invalid / country fill.
import asyncio, os, sys, collections
sys.path.insert(0, "/app/backend")
import server
from motor.motor_asyncio import AsyncIOMotorClient

SHEET_URL = "https://docs.google.com/spreadsheets/d/11qQKV39XNNGwQ9IWCw671BdvKQsVXOjEko1EOD6PK6Q/edit"
H = ["Date", "Name", "Phone", "Email", "City", "Country", "Campaign", "Form"]


async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    server.db = client["iter16_dry_tmp"]

    async def no_send(*a, **k):
        raise AssertionError("send called")
    server.send_routed_whatsapp = no_send
    server._send_whatsapp_api = no_send
    try:
        for gid, name in (("2139819490", "EU"), ("1551110032", "NON-EU")):
            cols = [{"heading": h, "sheet_column": ""} for h in H]
            cols[1]["sheet_column"], cols[2]["sheet_column"] = "full_name", "phone"
            csv = await server.fetch_google_sheet_csv(f"{SHEET_URL}#gid={gid}")
            hdr = csv.splitlines()[0]
            for i, h in enumerate(H):
                if not cols[i]["sheet_column"]:
                    cols[i]["sheet_column"] = server._guess_sheet_column(h, hdr.split(","))
            sheet = {"campaign_sheet_id": gid, "account": "berlin", "spreadsheet_url": SHEET_URL, "gid": gid, "label": name,
                     "columns": cols, "phone_col": 2, "name_col": 1, "branch_col": 5, "online_branch_col": -1, "last_sync": None}
            r = await server._do_campaign_sheet_sync(sheet)
            leads = [d async for d in server.db.campaign_leads.find({"campaign_sheet_id": gid}, {"_id": 0})]
            st = collections.Counter((d.get("whatsapp") or {}).get("status") for d in leads)
            errs = collections.Counter((d.get("whatsapp") or {}).get("error") for d in leads if (d.get("whatsapp") or {}).get("status") == "invalid")
            countries = collections.Counter(d["values"][5] for d in leads)
            print(name, "header:", hdr[:200])
            print(" mapping:", [c["sheet_column"] for c in cols])
            print(" result:", r["message"], dict(st))
            print(" invalid errors:", dict(errs))
            print(" invalid phones:", [(d["values"][2], d["phone"]) for d in leads if (d.get("whatsapp") or {}).get("status") == "invalid"])
            print(" countries:", countries.most_common(15))
            print(" empty country w/ phone:", sum(1 for d in leads if d["phone"] and not d["values"][5]))
    finally:
        await client.drop_database("iter16_dry_tmp")

asyncio.run(main())
