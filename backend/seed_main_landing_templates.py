"""Seed/upsert the two main-page landing AiSensy templates.

Run:
    cd /app/backend && python seed_main_landing_templates.py
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


TEMPLATES = [
    {
        "name": "Main Page – Offline (India)",
        "wa_template_name": "landing_india_offline",
        "language_code": "en",
        "category": "main_offline",
        "trigger_type": "immediate",
        "days_before": 0,
        "send_hour_utc": 4,
        "active": True,
        # {{1}} name, {{2}} branch, {{3}} address, {{4}} contact name, {{5}} phone
        "body_params": [
            "name",
            "preferred_branch",
            "branch_address",
            "branch_contact_name",
            "branch_phone",
        ],
        "header_param": None,
    },
    {
        "name": "Main Page – Online (India)",
        "wa_template_name": "landing_india_online",
        "language_code": "en",
        "category": "main_online",
        "trigger_type": "immediate",
        "days_before": 0,
        "send_hour_utc": 4,
        "active": True,
        # {{1}} name
        "body_params": ["name"],
        "header_param": None,
    },
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc)

    for tpl in TEMPLATES:
        existing = await db.whatsapp_templates.find_one(
            {"wa_template_name": tpl["wa_template_name"]}
        )
        doc = {**tpl, "updated_at": now}
        if existing:
            await db.whatsapp_templates.update_one(
                {"wa_template_name": tpl["wa_template_name"]},
                {"$set": doc},
            )
            print(f"Updated template: {tpl['wa_template_name']}")
        else:
            doc["template_id"] = str(uuid.uuid4())
            doc["created_at"] = now
            await db.whatsapp_templates.insert_one(doc)
            print(f"Inserted template: {tpl['wa_template_name']}")

    # Show current state
    cursor = db.whatsapp_templates.find(
        {"category": {"$in": ["main_online", "main_offline"]}}, {"_id": 0}
    )
    rows = await cursor.to_list(length=50)
    print("\nMain landing templates currently in DB:")
    for r in rows:
        print(
            f"  - {r['wa_template_name']:<25} category={r['category']:<13} "
            f"active={r['active']} body_params={r['body_params']}"
        )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
