"""Seed/upsert the 6 Germany Fair AiSensy templates.

Scheduling:
  GF1 immediate
  GF2 25% between signup and event, at 04:30 UTC (10:00 IST)
  GF3 50% between signup and event, at 04:30 UTC
  GF4 75% between signup and event, at 04:30 UTC
  GF5 1 day before event at 04:30 UTC
  GF6 event day at 04:30 UTC (with video)

Run:
    cd /app/backend && python seed_germany_fair_templates.py
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
        "name": "GF 1 — Welcome / Slot Confirmed (immediate)",
        "wa_template_name": "germany_fair_1",
        "language_code": "en",
        "category": "germany_fair",
        "trigger_type": "immediate",
        "days_before": 0,
        "fraction": 0.0,
        "send_hour_utc": 4,
        "send_minute_utc": 30,
        "active": True,
        # {{1}} name, {{2}} event_date, {{3}} contact_name, {{4}} contact_phone
        "body_params": ["name", "event_date", "branch_contact_name", "branch_phone"],
        "header_param": None,
    },
    {
        "name": "GF 2 — Why Choose VisaXpert (25% to event)",
        "wa_template_name": "germany_fair_2",
        "language_code": "en",
        "category": "germany_fair",
        "trigger_type": "fraction",
        "days_before": 0,
        "fraction": 0.25,
        "send_hour_utc": 4,
        "send_minute_utc": 30,
        "active": True,
        # {{1}} name, {{2}} event_date, {{3}} contact_name, {{4}} contact_phone
        "body_params": ["name", "event_date", "branch_contact_name", "branch_phone"],
        "header_param": None,
    },
    {
        "name": "GF 3 — Perks at the Fair (50% to event)",
        "wa_template_name": "germany_fair_3",
        "language_code": "en",
        "category": "germany_fair",
        "trigger_type": "fraction",
        "days_before": 0,
        "fraction": 0.50,
        "send_hour_utc": 4,
        "send_minute_utc": 30,
        "active": True,
        # {{1}} name, {{2}} contact_name, {{3}} contact_phone
        "body_params": ["name", "branch_contact_name", "branch_phone"],
        "header_param": None,
    },
    {
        "name": "GF 4 — Confirm Slot / Be On Time (75% to event)",
        "wa_template_name": "germany_fair_4",
        "language_code": "en",
        "category": "germany_fair",
        "trigger_type": "fraction",
        "days_before": 0,
        "fraction": 0.75,
        "send_hour_utc": 4,
        "send_minute_utc": 30,
        "active": True,
        # {{1}} name
        "body_params": ["name"],
        "header_param": None,
    },
    {
        "name": "GF 5 — 24 Hours To Go (1 day before)",
        "wa_template_name": "germany_fair_5",
        "language_code": "en",
        "category": "germany_fair",
        "trigger_type": "days_before",
        "days_before": 1,
        "fraction": 0.0,
        "send_hour_utc": 4,
        "send_minute_utc": 30,
        "active": True,
        # {{1}} name, {{2}} contact_name, {{3}} contact_phone
        "body_params": ["name", "branch_contact_name", "branch_phone"],
        "header_param": None,
        # Image header — upload via dashboard and patch this field
        "header_media_type": "image",
        "header_media_url": None,
    },
    {
        "name": "GF 6 — Today Is The Day (event day, 10:00 IST)",
        "wa_template_name": "germany_fair_6",
        "language_code": "en",
        "category": "germany_fair",
        "trigger_type": "same_day",
        "days_before": 0,
        "fraction": 0.0,
        "send_hour_utc": 4,
        "send_minute_utc": 30,
        "active": True,
        # {{1}} name, {{2}} location_url (static for now), {{3}} contact_name, {{4}} contact_phone
        "body_params": [
            "name",
            "static:https://maps.google.com/",
            "branch_contact_name",
            "branch_phone",
        ],
        "header_param": None,
        # Video header — upload via dashboard and patch this field
        "header_media_type": "video",
        "header_media_url": None,
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
            # Preserve any previously uploaded media URL
            if existing.get("header_media_url") and not doc.get("header_media_url"):
                doc["header_media_url"] = existing["header_media_url"]
                doc["header_media_type"] = existing.get("header_media_type") or doc.get("header_media_type")
            await db.whatsapp_templates.update_one(
                {"wa_template_name": tpl["wa_template_name"]},
                {"$set": doc},
            )
            print(f"Updated : {tpl['wa_template_name']:<18} trigger={tpl['trigger_type']}")
        else:
            doc["template_id"] = str(uuid.uuid4())
            doc["created_at"] = now
            await db.whatsapp_templates.insert_one(doc)
            print(f"Inserted: {tpl['wa_template_name']:<18} trigger={tpl['trigger_type']}")

    # Summary
    cursor = db.whatsapp_templates.find({"category": "germany_fair"}, {"_id": 0}).sort(
        "wa_template_name", 1
    )
    rows = await cursor.to_list(length=50)
    print("\nGermany Fair templates in DB:")
    for r in rows:
        media = r.get("header_media_type") or "—"
        print(
            f"  - {r['wa_template_name']:<18} trigger={r['trigger_type']:<12} "
            f"days_before={r.get('days_before', 0):<2} fraction={r.get('fraction', 0.0):<4} "
            f"media={media} active={r['active']}"
        )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
