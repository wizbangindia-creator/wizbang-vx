import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import server  # noqa: E402

PHONE = sys.argv[1]
NAME = "Smoke Test"


async def main():
    await server.startup_db_client()
    routes = (await server._get_wa_routes())["templates"]
    for key in routes:
        r = await server.send_routed_whatsapp(key, PHONE, NAME)
        print(f"{key:18} {routes[key]:32} {'SENT' if r.get('ok') else 'FAILED'} {str(r.get('error', ''))[:160]}")
    r = await server.send_whatsapp_template_message(PHONE, NAME)
    print(f"{'meta/google ads':18} {'crmall':32} {r}")


asyncio.run(main())
