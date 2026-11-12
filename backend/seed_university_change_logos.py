"""
One-off seeder: migrate the hardcoded `germanUniversities` list from
frontend/src/pages/UniversityChangePage.jsx into the partner_logos
collection so they become manageable from the dashboard.

Run with:  python /app/backend/seed_university_change_logos.py
"""
import asyncio
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

UPLOAD_DIR = ROOT / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

SOURCE_DIR = Path("/app/frontend/public/assets/universities/germany")

# Same list as frontend/src/pages/UniversityChangePage.jsx :: germanUniversities
UNIVERSITIES = [
    {"name": "Technical University of Munich",          "file": "tum.jpg"},
    {"name": "SRH Hochschule Berlin",                   "file": "srh.jpg"},
    {"name": "University of Europe",                    "file": "ue.jpg"},
    {"name": "GISMA Business School",                   "file": "gisma.jpg"},
    {"name": "IUBH Internationale Hochschule",          "file": "iubh.jpg"},
    {"name": "Berlin School of Business & Innovation",  "file": "bsbi.jpg"},
    {"name": "EU Business School",                      "file": "eu-business.jpg"},
    {"name": "Arden University",                        "file": "arden.jpg"},
    {"name": "Global University Systems",               "file": "gus.jpg"},
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    inserted = 0
    skipped = 0
    for u in UNIVERSITIES:
        existing = await db.partner_logos.find_one(
            {"name": u["name"], "pages": "university_change"}
        )
        if existing:
            print(f"  • skip (already exists): {u['name']}")
            skipped += 1
            continue

        src = SOURCE_DIR / u["file"]
        if not src.exists():
            print(f"  ! missing source file: {src}")
            continue

        # Copy file into backend/uploads with a unique name
        ext = src.suffix.lstrip(".").lower() or "jpg"
        new_name = f"plogo-{uuid.uuid4().hex[:10]}.{ext}"
        dest = UPLOAD_DIR / new_name
        shutil.copyfile(src, dest)

        doc = {
            "logo_id": str(uuid.uuid4()),
            "name": u["name"],
            "logo_url": f"/api/uploads/{new_name}",
            "pages": ["university_change"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
        }
        await db.partner_logos.insert_one(doc)
        inserted += 1
        print(f"  ✓ inserted: {u['name']}  ->  {doc['logo_url']}")

    print(f"\nDone. Inserted={inserted}, Skipped={skipped}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
