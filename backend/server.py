from fastapi import FastAPI, APIRouter, HTTPException, Query, Header, Depends, Request, UploadFile, File, Form
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import hashlib
import hmac
import secrets
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional, List, Any
import uuid
from datetime import datetime, timezone, timedelta
import re
import httpx
import phonenumbers
from phonenumbers import geocoder
import html
from motor.motor_asyncio import AsyncIOMotorClient
import json
try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:  # pragma: no cover
    from backports.zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment variables
GOOGLE_SHEET_WEBHOOK = os.environ.get('GOOGLE_SHEET_WEBHOOK', '')

# WhatsApp Business API credentials (legacy BSP — nirvachanguru)
WHATSAPP_ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')
WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '1021627281029893')
WHATSAPP_TEMPLATE_NAME = os.environ.get('WHATSAPP_TEMPLATE_NAME', 'crmall')

# AiSensy provider — HARDCODED API keys per user request.
# WHATSAPP_PROVIDER controls which upstream WhatsApp API is hit:
#   - "aisensy" -> AiSensy V2 Campaign API
#   - "bsp"     -> legacy nirvachanguru Cloud-API proxy
AISENSY_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODVlOGM0YWFlYWUyMGQ4MmM1MGRkNyIsIm5hbWUiOiJWaXNheHBlcnQgLSBUaGUgU3R1ZHkgQWJyb2FkIFNwZWNpYWwiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjZmMjc3NjZmMTk3NTgwYjc1NTRhNjk2IiwiYWN0aXZlUGxhbiI6IkJBU0lDX01PTlRITFkiLCJpYXQiOjE3OTM4MDI5Nzd9.HIofTNnf39aEvy94Q2rwa6HtUpaxD4wScWfEc7Ds6mw"
# Dedicated AiSensy key for the Berlin (university change) page.
AISENSY_API_KEY_UC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZjIxZjMzNmM4ZGM0NjVmZjQ5YmUzZSIsIm5hbWUiOiJWaXNhWHBlcnQgLSBCZXJsaW4iLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjZmMjc3NjZmMTk3NTgwYjc1NTRhNjk2IiwiYWN0aXZlUGxhbiI6IkJBU0lDX01PTlRITFkiLCJpYXQiOjE3OTMyMTE0NDl9.2J7tH2aGDp-oymwOoDRJf_RI6peHjAvYciYiiVgK9C8"
AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2"
WHATSAPP_PROVIDER = "aisensy"

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'visaxpert')

# Dashboard credentials - Multiple users with different access
DASHBOARD_USERS = {
    "sunilarora@visaxpert.co": {
        "password": "VisaXpert@2024",
        "name": "Sunil Arora",
        "access": "main_landing",  # Can see leads from main landing page
        "sources": ["website", "meta_ads", "google_sheets", "manual", "ivr_missed_call"]  # Includes IVR leads
    },
    "navyaarora@visaxpert.co": {
        "password": "VisaXpert@2024",
        "name": "Navya Arora", 
        "access": "university_change",  # Can see leads from university change page
        "sources": ["university_change"]
    },
    "admin@visaxpert.com": {
        "password": "VisaXpert@2024",
        "name": "Admin",
        "access": "all",  # Can see all leads
        "sources": []  # Empty means all sources
    }
}

# Legacy credentials (kept for backward compatibility)
DASHBOARD_EMAIL = os.environ.get('DASHBOARD_EMAIL', 'admin@visaxpert.com')
DASHBOARD_PASSWORD = os.environ.get('DASHBOARD_PASSWORD', 'VisaXpert@2024')

# Facebook App credentials (for webhook verification)
FB_APP_SECRET = os.environ.get('FB_APP_SECRET', '')
FB_VERIFY_TOKEN = os.environ.get('FB_VERIFY_TOKEN', 'visaxpert_verify_token_2024')

# Google Sheets Auto-Sync (for importer)
GOOGLE_SHEETS_ID = os.environ.get('GOOGLE_SHEETS_ID', '')
GOOGLE_SHEETS_RANGE = os.environ.get('GOOGLE_SHEETS_RANGE', 'Sheet1!A:G')
GOOGLE_SHEETS_SYNC_URL = os.environ.get('GOOGLE_SHEETS_SYNC_URL', '')

# MongoDB client
mongo_client: AsyncIOMotorClient = None
db = None

# Create the main app
app = FastAPI(title="VisaXpert API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

MAIN_LANDING_BRANCHES = {"Ludhiana", "Amritsar", "Pathankot", "Jammu"}


class EnquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    # Accept human-friendly formats like "+91 98765 43210", "(123) 456-7890" etc.
    # Validator normalizes to digits-only and enforces 10 or 12 digit count.
    phone: str = Field(..., min_length=7, max_length=25)
    # City is now derived from counselling_mode / preferred_branch; kept optional
    # for backward compatibility with any legacy callers.
    city: Optional[str] = Field(default=None, max_length=100)
    country_of_interest: str
    # New fields for counselling preference
    counselling_mode: str = Field(..., description="'online' or 'offline'")
    preferred_branch: Optional[str] = Field(default=None, max_length=100)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', v):
            raise ValueError('Please enter a valid email address')
        return v

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        digits = re.sub(r'\D', '', v or '')
        if len(digits) not in (10, 12):
            raise ValueError('Please enter a valid 10 or 12 digit phone number')
        return digits

    @field_validator('country_of_interest')
    @classmethod
    def validate_country(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Please enter a valid country name')
        return v

    @field_validator('counselling_mode')
    @classmethod
    def validate_mode(cls, v):
        v = (v or "").strip().lower()
        if v not in {"online", "offline"}:
            raise ValueError("counselling_mode must be 'online' or 'offline'")
        return v

    @field_validator('preferred_branch')
    @classmethod
    def validate_branch(cls, v):
        if v is None:
            return v
        v = v.strip()
        if v == "":
            return None
        if v not in MAIN_LANDING_BRANCHES:
            raise ValueError(f"preferred_branch must be one of {sorted(MAIN_LANDING_BRANCHES)}")
        return v


class EnquiryResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    city: str
    country_of_interest: str
    created_at: str
    status: str


# Webhook Lead Model - Flexible for Meta/Google Ads
class WebhookLead(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    country_of_interest: Optional[str] = None
    source: Optional[str] = "webhook"
    campaign: Optional[str] = None
    ad_name: Optional[str] = None
    form_name: Optional[str] = None
    platform: Optional[str] = None
    preferred_city: Optional[str] = None  # For Germany Fair: which city user registered for
    
    class Config:
        extra = "allow"


class LeadResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    city: str
    country: str
    source: str
    status: str
    created_at: str
    campaign: Optional[str] = None
    platform: Optional[str] = None
    extra_data: Optional[dict] = None


class LeadsListResponse(BaseModel):
    leads: List[LeadResponse]
    total: int
    page: int
    per_page: int


class DashboardStats(BaseModel):
    total_leads: int
    today_leads: int
    website_leads: int
    meta_leads: int
    google_leads: int
    other_leads: int
    new_leads: int
    contacted_leads: int
    converted_leads: int


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None


class ImportResult(BaseModel):
    success: bool
    imported: int
    skipped: int
    message: str


class SyncSettings(BaseModel):
    google_sheets_url: Optional[str] = None
    auto_sync_enabled: bool = False
    sync_interval_minutes: int = 30
    last_sync: Optional[str] = None


# ==================== DATABASE ====================

async def get_database():
    return db


async def startup_db_client():
    global mongo_client, db
    try:
        mongo_client = AsyncIOMotorClient(MONGO_URL)
        db = mongo_client[DB_NAME]
        await mongo_client.admin.command('ping')
        logger.info("Connected to MongoDB successfully")
        
        # Create indexes
        await db.leads.create_index("created_at")
        await db.leads.create_index("source")
        await db.leads.create_index("email")
        await db.leads.create_index("phone")
        await db.leads.create_index([("email", 1), ("phone", 1), ("created_at", -1)])
        # Unique sparse index for incremental sheets sync (skip rows already imported)
        try:
            await db.leads.create_index(
                "sheet_external_id", unique=True, sparse=True
            )
        except Exception as e:
            logger.warning(f"sheet_external_id index skipped: {e}")
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def shutdown_db_client():
    global mongo_client
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed")


# ==================== AUTH HELPERS ====================

def generate_token(email: str) -> str:
    """Generate a simple session token"""
    timestamp = datetime.now(timezone.utc).isoformat()
    data = f"{email}:{timestamp}:{secrets.token_hex(16)}"
    return hashlib.sha256(data.encode()).hexdigest()


def verify_credentials(email: str, password: str) -> dict:
    """Verify email and password, returns user info if valid"""
    # Normalise inputs: trim surrounding whitespace (common when typed on
    # mobile / pasted) and lowercase the email so login is forgiving.
    email_lower = (email or "").strip().lower()
    password = (password or "").strip()
    if email_lower in DASHBOARD_USERS:
        user = DASHBOARD_USERS[email_lower]
        if user["password"] == password:
            return {
                "valid": True,
                "email": email_lower,
                "name": user["name"],
                "access": user["access"],
                "sources": user["sources"]
            }
    # Legacy check
    if email_lower == DASHBOARD_EMAIL.strip().lower() and password == DASHBOARD_PASSWORD.strip():
        return {
            "valid": True,
            "email": email_lower,
            "name": "Admin",
            "access": "all",
            "sources": []
        }
    return {"valid": False}


def verify_auth(email: str = Query(...), password: str = Query(...)) -> dict:
    """Verify authentication via query params, returns user info"""
    user_info = verify_credentials(email, password)
    if not user_info["valid"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user_info


def get_source_filter(user_info: dict) -> dict:
    """Get MongoDB filter based on user's access level"""
    if user_info["access"] == "all" or not user_info["sources"]:
        return {}  # No filter, show all
    
    if user_info["access"] == "university_change":
        return {"source": "university_change"}
    
    if user_info["access"] == "main_landing":
        # Show everything except university_change
        return {"source": {"$ne": "university_change"}}


# ==================== HELPER FUNCTIONS ====================

async def send_to_google_sheets(enquiry_data: dict) -> bool:
    if not GOOGLE_SHEET_WEBHOOK:
        logger.warning("Google Sheets webhook not configured!")
        return False
    
    try:
        async with httpx.AsyncClient(follow_redirects=True) as http_client:
            response = await http_client.post(
                GOOGLE_SHEET_WEBHOOK,
                json=enquiry_data,
                timeout=15.0
            )
            if response.status_code == 200:
                logger.info(f"Successfully sent enquiry to Google Sheets: {enquiry_data.get('name', 'Unknown')}")
                return True
            else:
                logger.warning(f"Google Sheets response: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"Failed to send to Google Sheets: {str(e)}")
        return False


async def save_lead_to_db(lead_data: dict) -> str:
    """Save a lead to MongoDB and return the ID"""
    try:
        lead_id = str(uuid.uuid4())
        lead_doc = {
            "lead_id": lead_id,
            "name": lead_data.get("name", ""),
            "email": lead_data.get("email", ""),
            "phone": lead_data.get("phone", ""),
            "city": lead_data.get("city", ""),
            "country": lead_data.get("country", ""),
            "source": lead_data.get("source", "website"),
            "status": "new",
            "campaign": lead_data.get("campaign"),
            "platform": lead_data.get("platform"),
            "extra_data": lead_data.get("extra_data", {}),
            "created_at": datetime.now(timezone.utc),
        }
        
        await db.leads.insert_one(lead_doc)
        logger.info(f"Saved lead to database: {lead_id} from {lead_data.get('source', 'website')}")
        return lead_id
    except Exception as e:
        logger.error(f"Failed to save lead to database: {e}")
        raise


async def check_duplicate_lead(email: str, phone: str, hours: int = 24) -> bool:
    """Check if a lead with same email/phone exists in last N hours"""
    if not email and not phone:
        return False
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    query = {
        "created_at": {"$gte": cutoff},
        "$or": []
    }
    
    if email:
        query["$or"].append({"email": email})
    if phone:
        query["$or"].append({"phone": phone})
    
    if not query["$or"]:
        return False
    
    existing = await db.leads.find_one(query)
    return existing is not None


async def send_whatsapp_template_message(phone: str, name: str):
    """Legacy one-shot WhatsApp message sender (IVR / non-fair leads).

    Uses the unified dispatcher so it automatically picks AiSensy or the
    legacy BSP based on WHATSAPP_PROVIDER.
    """
    if not phone:
        return False
    if WHATSAPP_PROVIDER == "aisensy" and not AISENSY_API_KEY:
        logger.warning("AiSensy provider selected but AISENSY_API_KEY missing, skipping WhatsApp message")
        return False
    if WHATSAPP_PROVIDER == "bsp" and not WHATSAPP_ACCESS_TOKEN:
        logger.warning("BSP provider selected but WHATSAPP_ACCESS_TOKEN missing, skipping WhatsApp message")
        return False

    result = await _send_whatsapp_api(
        to_phone=phone,
        template_name=WHATSAPP_TEMPLATE_NAME,
        language_code="en",
        body_params=[],
        header_param=None,
        recipient_name=name or "",
    )
    if result.get("ok"):
        logger.info(f"WhatsApp template '{WHATSAPP_TEMPLATE_NAME}' sent to {phone} via {WHATSAPP_PROVIDER}")
        return True
    logger.error(f"WhatsApp send failed to {phone} via {WHATSAPP_PROVIDER}: {result.get('error', '')[:200]}")
    return False


# ==================== IELTS CELEBRATION WHATSAPP DISPATCH ====================

IELTS_WA_SCENARIO_TO_BOOK = "to_book_template"
IELTS_WA_SCENARIO_PTE_OTHERS = "pte_others_template"
IELTS_WA_SCENARIO_ALREADY_BOOKED = "already_booked_template"


def _pick_ielts_wa_scenario(english_test: str, urgency: str) -> str:
    """Decide which IELTS WhatsApp template scenario applies to this lead."""
    et = (english_test or "").strip().lower()
    ur = (urgency or "").strip().lower()
    if et in ("pte", "others"):
        return IELTS_WA_SCENARIO_PTE_OTHERS
    if ur == "already booked":
        return IELTS_WA_SCENARIO_ALREADY_BOOKED
    return IELTS_WA_SCENARIO_TO_BOOK


async def _get_ielts_wa_template_for_scenario(scenario: str) -> str:
    """Read the IELTS WhatsApp template settings from db.settings and return
    the template name for the given scenario. Falls back to WHATSAPP_TEMPLATE_NAME
    if the admin hasn't configured one."""
    if db is None:
        return WHATSAPP_TEMPLATE_NAME
    doc = await db.settings.find_one({"type": "ielts_whatsapp_templates"}) or {}
    tpl = (doc.get(scenario) or "").strip()
    return tpl or WHATSAPP_TEMPLATE_NAME


async def send_ielts_celebration_whatsapp(phone: str, name: str,
                                          english_test: str, urgency: str):
    """Send the scenario-specific IELTS Celebration WhatsApp template.

    Body variable passed to the template: just the user's name (1 param).
    Admin configures the template names via /api/dashboard/ielts-whatsapp-settings.
    """
    if not phone:
        return False
    if WHATSAPP_PROVIDER == "aisensy" and not AISENSY_API_KEY:
        logger.warning("AiSensy key missing, skipping IELTS celebration WhatsApp")
        return False
    if WHATSAPP_PROVIDER == "bsp" and not WHATSAPP_ACCESS_TOKEN:
        logger.warning("BSP token missing, skipping IELTS celebration WhatsApp")
        return False

    scenario = _pick_ielts_wa_scenario(english_test, urgency)
    template_name = await _get_ielts_wa_template_for_scenario(scenario)

    result = await _send_whatsapp_api(
        to_phone=phone,
        template_name=template_name,
        language_code="en",
        body_params=[name or ""],
        header_param=None,
        recipient_name=name or "",
    )
    if result.get("ok"):
        logger.info(f"IELTS WhatsApp '{template_name}' (scenario={scenario}) sent to {phone}")
        return True
    logger.error(f"IELTS WhatsApp '{template_name}' (scenario={scenario}) failed to {phone}: {result.get('error', '')[:200]}")
    return False


# University Change WhatsApp ─────────────────────────────────────────────
# Uses a dedicated AiSensy sub-account (VisaXpert - Berlin) via
# AISENSY_API_KEY_UC, with one template per consultation mode.
UC_WA_SCENARIO_IN_PERSON = "in_person_template"
UC_WA_SCENARIO_TELEPHONIC = "telephonic_template"
UC_WA_SCENARIO_ONLINE = "online_template"


def _pick_uc_wa_scenario(consultation_mode: str) -> str:
    """Map the consultation_mode form field to a UC WhatsApp scenario."""
    mode = (consultation_mode or "").strip().lower()
    if mode == "in_person":
        return UC_WA_SCENARIO_IN_PERSON
    if mode == "telephonic":
        return UC_WA_SCENARIO_TELEPHONIC
    if mode == "online":
        return UC_WA_SCENARIO_ONLINE
    # Unknown / missing → default to in_person template so leads still get a
    # follow-up. Admin can change this template name from the dashboard.
    return UC_WA_SCENARIO_IN_PERSON


async def _get_uc_wa_template_for_scenario(scenario: str) -> str:
    if db is None:
        return ""
    doc = await db.settings.find_one({"type": "uc_whatsapp_templates"}) or {}
    return (doc.get(scenario) or "").strip()


async def send_university_change_whatsapp(phone: str, name: str,
                                          consultation_mode: str, lead_id: str):
    """Send the Berlin vx_counselling_final template (name only) via the Berlin AiSensy account."""
    if not phone:
        return False
    await send_routed_whatsapp("berlin", phone, name, doc_id=lead_id)
    return True


# IVR-specific WhatsApp campaign names (no template params)
IVR_CAMPAIGN_CONNECTED = "call_connected"
IVR_CAMPAIGN_NOT_CONNECTED = "call_notconnected"


def _ivr_call_connected(status: str, talk_duration: str) -> bool:
    """Decide whether an IVR call actually connected (agent + customer talked)."""
    s = (status or "").strip().lower()
    try:
        talk = int(str(talk_duration or "0").split(".")[0])
    except ValueError:
        talk = 0
    return s == "answered" or talk > 0


async def send_ivr_whatsapp(phone: str, status: str, talk_duration: str):
    """Send the appropriate IVR follow-up WhatsApp template based on call outcome."""
    if not phone:
        return False
    if WHATSAPP_PROVIDER == "aisensy" and not AISENSY_API_KEY:
        logger.warning("AiSensy key missing, skipping IVR WhatsApp")
        return False

    connected = _ivr_call_connected(status, talk_duration)
    campaign = IVR_CAMPAIGN_CONNECTED if connected else IVR_CAMPAIGN_NOT_CONNECTED

    result = await _send_whatsapp_api(
        to_phone=phone,
        template_name=campaign,
        language_code="en",
        body_params=[],
        header_param=None,
        recipient_name="",
    )
    if result.get("ok"):
        logger.info(f"IVR WhatsApp '{campaign}' sent to {phone} (connected={connected})")
        return True
    logger.error(f"IVR WhatsApp '{campaign}' failed to {phone}: {result.get('error', '')[:200]}")
    return False


# ==================== API ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "VisaXpert API", "status": "running"}


@api_router.get("/health")
async def health_check():
    db_status = "connected" if db is not None else "disconnected"
    return {
        "status": "healthy",
        "sheets_configured": bool(GOOGLE_SHEET_WEBHOOK),
        "database": db_status,
        "facebook_configured": bool(FB_APP_SECRET)
    }


# Website Form Submission
@api_router.post("/enquiry", response_model=EnquiryResponse)
async def create_enquiry(input: EnquiryCreate):
    created_at = datetime.now(timezone.utc).isoformat()

    mode = input.counselling_mode  # already normalised to 'online'/'offline'
    preferred_branch = input.preferred_branch or ""

    # Require a branch when mode is offline
    if mode == "offline" and not preferred_branch:
        raise HTTPException(
            status_code=422,
            detail="Please choose your nearest branch for offline counselling.",
        )

    # Derive a human-readable city value so existing dashboard/exports keep working
    if mode == "online":
        city_value = "Online (Google/Zoom)"
    else:
        city_value = preferred_branch or (input.city or "")

    lead_data = {
        "name": input.name,
        "email": input.email,
        "phone": input.phone,
        "city": city_value,
        "country": input.country_of_interest,
        "source": "website",
        "platform": "website",
        "extra_data": {
            "counselling_mode": mode,
            "preferred_branch": preferred_branch,
        },
    }

    try:
        lead_id = await save_lead_to_db(lead_data)
    except Exception as e:
        logger.error(f"Database error: {e}")
        lead_id = str(uuid.uuid4())

    asyncio.create_task(send_routed_whatsapp("website", input.phone, input.name, doc_id=lead_id))

    # Also send to Google Sheets
    sheets_data = {
        "name": input.name,
        "email": input.email,
        "phone": input.phone,
        "city": city_value,
        "country": input.country_of_interest,
        "date": created_at,
        "source": "website",
        "counselling_mode": mode,
        "preferred_branch": preferred_branch,
    }
    await send_to_google_sheets(sheets_data)

    return EnquiryResponse(
        id=lead_id,
        name=input.name,
        email=input.email,
        phone=input.phone,
        city=city_value,
        country_of_interest=input.country_of_interest,
        created_at=created_at,
        status="submitted"
    )


# ==================== UNIVERSAL WEBHOOK ====================

@api_router.get("/webhook/lead")
async def receive_webhook_lead_get(request: Request):
    """
    Compat GET handler for providers (e.g. IVR / missed-call services) that were
    given the universal /webhook/lead URL but actually push IVR-style query
    params (SourceNumber, CallSid, Status, ...). We detect those and delegate to
    the IVR webhook handler, otherwise return a helpful JSON response instead of 405.
    """
    params = dict(request.query_params)
    ivr_signals = {"SourceNumber", "CallSid", "DestinationNumber", "Direction",
                   "DialWhomNumber", "TalkDuration", "CallRecordingUrl"}
    if any(k in params for k in ivr_signals) or params.get("type") == "call_report":
        return await receive_ivr_webhook_get(request)
    return {
        "success": False,
        "message": "Use POST with a JSON body for /api/webhook/lead, or hit /api/webhook/ivr for IVR missed-call pushes.",
    }


@api_router.post("/webhook/lead")
async def receive_webhook_lead(lead: WebhookLead):
    """Universal webhook for any lead source"""
    name = lead.name or lead.full_name or ""
    phone = lead.phone or lead.phone_number or ""
    country = lead.country or lead.country_of_interest or ""
    
    source = lead.source or "webhook"
    if lead.platform:
        if "facebook" in lead.platform.lower() or "instagram" in lead.platform.lower():
            source = "meta"
        elif "google" in lead.platform.lower():
            source = "google"
    
    extra_data = {}
    lead_dict = lead.model_dump()
    standard_fields = {'name', 'full_name', 'email', 'phone', 'phone_number', 'city', 'country', 'country_of_interest', 'source', 'campaign', 'ad_name', 'form_name', 'platform'}
    for key, value in lead_dict.items():
        if key not in standard_fields and value is not None:
            extra_data[key] = value

    # For paid ad traffic, prefer utm_campaign (or fbclid/gclid metadata) so
    # the dashboard's Campaign column shows the exact ad set that produced
    # the lead instead of the hard-coded label the form sent.
    utm_campaign = (extra_data or {}).get("utm_campaign") or ""
    utm_source = (extra_data or {}).get("utm_source") or ""
    utm_medium = (extra_data or {}).get("utm_medium") or ""
    resolved_campaign = (
        utm_campaign
        or lead.campaign
        or lead.ad_name
        or lead.form_name
    )
    resolved_platform = lead.platform
    if not resolved_platform:
        src_lc = (utm_source or "").lower()
        if "facebook" in src_lc or "instagram" in src_lc or "meta" in src_lc or "fb" in src_lc:
            resolved_platform = "meta"
        elif "google" in src_lc:
            resolved_platform = "google"

    lead_data = {
        "name": name,
        "email": lead.email or "",
        "phone": phone,
        "city": lead.city or "",
        "country": country,
        "source": source,
        "campaign": resolved_campaign,
        "platform": resolved_platform,
        "preferred_city": lead.preferred_city,
        "extra_data": extra_data if extra_data else None
    }
    
    try:
        lead_id = await save_lead_to_db(lead_data)
    except Exception as e:
        logger.error(f"Failed to save webhook lead: {e}")
        raise HTTPException(status_code=500, detail="Failed to save lead")
    
    # Germany Fair: enqueue multi-touch WhatsApp campaign via dashboard templates
    if source == "germany_fair" and phone:
        asyncio.create_task(_enqueue_germany_fair_messages(lead_id, lead_data))
    # IELTS Celebration: scenario-based WhatsApp template (admin-configurable)
    elif source == "ielts_celebration" and phone:
        ielts_english_test = (extra_data or {}).get("english_test", "") if extra_data else ""
        ielts_urgency = (extra_data or {}).get("urgency", "") if extra_data else ""
        asyncio.create_task(send_ielts_celebration_whatsapp(
            phone, name, ielts_english_test, ielts_urgency
        ))
    # University Change: scenario-based WhatsApp via the Berlin AiSensy account
    elif source == "university_change" and phone:
        uc_wa_mode = (extra_data or {}).get("consultation_mode", "") if extra_data else ""
        asyncio.create_task(send_university_change_whatsapp(
            phone, name, uc_wa_mode, lead_id
        ))
    # Meta / Google ad webhooks keep the legacy one-shot template
    elif source in ("meta", "google", "webhook") and phone:
        asyncio.create_task(send_whatsapp_template_message(phone, name))
    # Website quick-query forms: instant visaxpert_website template
    elif source not in WEBSITE_WA_EXCLUDED_SOURCES and phone:
        asyncio.create_task(send_routed_whatsapp("website", phone, name, doc_id=lead_id))

    # Also send to Google Sheets
    sheets_data = {
        "name": name,
        "email": lead.email or "",
        "phone": phone,
        "city": lead.city or "",
        "country": country,
        "date": datetime.now(timezone.utc).isoformat(),
        "source": source
    }
    await send_to_google_sheets(sheets_data)
    
    return {"success": True, "lead_id": lead_id, "message": "Lead received successfully"}


# ==================== UC CLICK TRACKING (WhatsApp / Call) ====================
# Lightweight event log so the Berlin page's WhatsApp/Call button clicks are
# attributed to the marketing campaign (UTM params) that drove them.

class UCClickIn(BaseModel):
    click_type: str = Field(..., description="'whatsapp' or 'call'")
    page: Optional[str] = "berlin"
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    fbclid: Optional[str] = None
    gclid: Optional[str] = None
    referrer: Optional[str] = None
    landing_url: Optional[str] = None

    class Config:
        extra = "allow"


@api_router.post("/uc-click")
async def log_uc_click(payload: UCClickIn, request: Request):
    click_type = (payload.click_type or "").strip().lower()
    if click_type not in {"whatsapp", "call"}:
        raise HTTPException(status_code=400, detail="click_type must be 'whatsapp' or 'call'")
    try:
        raw = payload.model_dump()
        raw.pop("click_type", None)
        # Best-effort client IP capture
        client_ip = ""
        try:
            client_ip = (request.client.host if request.client else "") or ""
            xff = request.headers.get("x-forwarded-for") or ""
            if xff:
                client_ip = xff.split(",")[0].strip() or client_ip
        except Exception:
            pass
        doc = {
            "click_id": str(uuid.uuid4()),
            "click_type": click_type,
            "page": payload.page or "berlin",
            "utm_source": payload.utm_source or "",
            "utm_medium": payload.utm_medium or "",
            "utm_campaign": payload.utm_campaign or "",
            "utm_content": payload.utm_content or "",
            "utm_term": payload.utm_term or "",
            "fbclid": payload.fbclid or "",
            "gclid": payload.gclid or "",
            "referrer": payload.referrer or "",
            "landing_url": payload.landing_url or "",
            "extra": {k: v for k, v in raw.items()
                      if k not in {"page", "utm_source", "utm_medium", "utm_campaign",
                                   "utm_content", "utm_term", "fbclid", "gclid",
                                   "referrer", "landing_url"} and v is not None},
            "ip": client_ip,
            "user_agent": request.headers.get("user-agent", ""),
            "created_at": datetime.now(timezone.utc),
        }
        await db.uc_click_events.insert_one(doc)
        # Best-effort index (idempotent)
        try:
            await db.uc_click_events.create_index("created_at")
        except Exception:
            pass
        return {"success": True, "click_id": doc["click_id"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to log UC click: {e}")
        raise HTTPException(status_code=500, detail="Failed to log click")


@api_router.get("/dashboard/uc-click-events")
async def dashboard_list_uc_clicks(
    email: str = Query(...),
    password: str = Query(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    click_type: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
):
    verify_auth(email, password)
    q: dict = {}
    if click_type:
        q["click_type"] = click_type.strip().lower()
    if utm_campaign:
        q["utm_campaign"] = utm_campaign
    total = await db.uc_click_events.count_documents(q)
    cursor = db.uc_click_events.find(q, {"_id": 0}).sort("created_at", -1)
    cursor = cursor.skip((page - 1) * per_page).limit(per_page)
    items = []
    async for d in cursor:
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        items.append(d)
    # Also compute a summary by campaign for quick dashboard display
    pipeline = [
        {"$match": q or {}},
        {"$group": {
            "_id": {"click_type": "$click_type", "utm_campaign": "$utm_campaign"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 100},
    ]
    summary = []
    async for row in db.uc_click_events.aggregate(pipeline):
        summary.append({
            "click_type": (row["_id"] or {}).get("click_type") or "",
            "utm_campaign": (row["_id"] or {}).get("utm_campaign") or "(none)",
            "count": row["count"],
        })
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "summary": summary,
    }


# ==================== IVR MISSED CALL WEBHOOK ====================

@api_router.get("/webhook/ivr")
async def receive_ivr_webhook_get(request: Request):
    """
    Webhook endpoint for IVR/Missed Call service (GET method with query params)
    Accepts leads from missed call panels like c2c.techmet.in / waflb.nirvachanguru.com
    
    Expected query params:
    - SourceNumber: Caller's phone number
    - DestinationNumber: Desk phone number
    - CallDuration: Duration in seconds
    - Status: cancel-customer, cancel-Agent, answered, etc.
    - StartTime, EndTime: Call timestamps
    - Direction: IVR
    - receiver_name: Agent/Branch name
    - CallRecordingUrl: Recording URL if available
    """
    try:
        # Get all query parameters
        params = dict(request.query_params)
        
        logger.info(f"IVR webhook received (GET): {json.dumps(params, indent=2)}")
        
        # Extract phone number (SourceNumber is the caller)
        phone = params.get('SourceNumber') or params.get('source_number') or params.get('caller') or ""
        
        # Clean phone number - remove country code if present
        if phone:
            phone = re.sub(r'[^\d]', '', str(phone))  # Remove non-digits
            if phone.startswith('91') and len(phone) > 10:
                phone = phone[2:]  # Remove 91 prefix
            if phone.startswith('0') and len(phone) > 10:
                phone = phone[1:]  # Remove leading 0
        
        # Extract other fields
        dest_number = params.get('DestinationNumber') or ""
        call_duration = params.get('CallDuration') or params.get('TalkDuration') or "0"
        status = params.get('Status') or "missed"
        start_time = params.get('StartTime') or ""
        end_time = params.get('EndTime') or ""
        direction = params.get('Direction') or "IVR"
        receiver_name = params.get('receiver_name') or params.get('DialWhomNumber') or ""
        call_recording = params.get('CallRecordingUrl') or ""
        call_sid = params.get('CallSid') or ""
        call_group = params.get('call_group') or ""
        # IVR providers use different names for the DTMF/keypress field — try
        # the most common spellings so the value reaches the dashboard.
        key_press = (
            params.get('key_press')
            or params.get('KeyPress')
            or params.get('KeyPressed')
            or params.get('key_pressed')
            or params.get('keypress')
            or params.get('Keypress')
            or params.get('digits')
            or params.get('Digits')
            or params.get('DigitsPressed')
            or params.get('DTMF')
            or params.get('dtmf')
            or params.get('PressedKey')
            or params.get('pressed_key')
            or params.get('ivr_input')
            or ""
        )
        
        # Build extra data with all received fields
        extra_data = {
            "destination_number": dest_number,
            "call_duration": call_duration,
            "talk_duration": params.get('TalkDuration') or "0",
            "status": status,
            "start_time": start_time,
            "end_time": end_time,
            "direction": direction,
            "receiver_name": receiver_name,
            "call_recording_url": call_recording,
            "call_sid": call_sid,
            "call_group": call_group,
            "key_press": key_press,
            "coins": params.get('coins') or "",
            "campaign_id": params.get('campid') or "",
            "client_id": params.get('client_id') or "",
            "raw_params": params  # Store complete original params
        }
        
        # Determine branch from receiver_name or destination number
        branch = receiver_name or ""
        if not branch and dest_number:
            # Map destination numbers to branches if known
            branch = f"Desk: {dest_number[-10:]}" if dest_number else ""
        
        # Create lead data
        lead_data = {
            "name": f"IVR Call - {phone[-4:] if phone else 'Unknown'}",
            "email": "",
            "phone": phone,
            "city": branch or "IVR Call",
            "country": "India",
            "source": "ivr_missed_call",
            "campaign": f"IVR - {status}",
            "platform": "techmet_ivr",
            "extra_data": extra_data
        }
        
        # Check if phone number exists
        if not phone:
            logger.warning("IVR webhook received without phone number")
            return {"success": False, "message": "SourceNumber is required"}
        
        # Save to database
        try:
            lead_id = await save_lead_to_db(lead_data)
            logger.info(f"IVR lead saved successfully: {lead_id}, phone: {phone}, status: {status}")
        except Exception as e:
            logger.error(f"Failed to save IVR lead: {e}")
            raise HTTPException(status_code=500, detail="Failed to save lead")
        
        if phone:
            asyncio.create_task(send_ivr_routed_whatsapp(phone, lead_id))
        
        # Send to Google Sheets
        sheets_data = {
            "name": lead_data["name"],
            "email": "",
            "phone": phone,
            "city": branch or "IVR",
            "country": "India",
            "date": start_time or datetime.now(timezone.utc).isoformat(),
            "source": f"ivr_missed_call ({status})"
        }
        await send_to_google_sheets(sheets_data)
        
        return {
            "success": True, 
            "lead_id": lead_id, 
            "message": "IVR lead received successfully",
            "phone": phone,
            "status": status
        }
        
    except Exception as e:
        logger.error(f"Error processing IVR webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/webhook/ivr")
async def receive_ivr_webhook_post(request: Request):
    """
    Webhook endpoint for IVR/Missed Call service (POST method)
    Accepts both JSON body and form data
    """
    try:
        # Try to parse as JSON first
        try:
            payload = await request.json()
        except Exception:
            # If not JSON, try form data
            form = await request.form()
            payload = dict(form)
        
        logger.info(f"IVR webhook received (POST): {json.dumps(payload, indent=2) if isinstance(payload, dict) else payload}")
        
        # Extract phone number (try multiple field names)
        phone = (
            payload.get('SourceNumber') or
            payload.get('source_number') or
            payload.get('caller') or 
            payload.get('phone') or 
            payload.get('phone_number') or 
            payload.get('caller_number') or 
            payload.get('mobile') or 
            ""
        )
        
        # Clean phone number
        if phone:
            phone = re.sub(r'[^\d]', '', str(phone))
            if phone.startswith('91') and len(phone) > 10:
                phone = phone[2:]
            if phone.startswith('0') and len(phone) > 10:
                phone = phone[1:]
        
        # Extract other fields
        status = payload.get('Status') or payload.get('status') or "missed"
        start_time = payload.get('StartTime') or payload.get('start_time') or ""
        receiver_name = payload.get('receiver_name') or payload.get('DialWhomNumber') or ""
        call_duration = payload.get('CallDuration') or payload.get('call_duration') or "0"
        talk_duration = payload.get('TalkDuration') or payload.get('talk_duration') or "0"
        
        # Build extra data
        extra_data = {
            "destination_number": payload.get('DestinationNumber') or "",
            "call_duration": call_duration,
            "talk_duration": talk_duration,
            "status": status,
            "start_time": start_time,
            "end_time": payload.get('EndTime') or "",
            "direction": payload.get('Direction') or "IVR",
            "receiver_name": receiver_name,
            "call_recording_url": payload.get('CallRecordingUrl') or "",
            "call_sid": payload.get('CallSid') or "",
            "raw_payload": payload
        }
        
        branch = receiver_name or ""
        
        lead_data = {
            "name": f"IVR Call - {phone[-4:] if phone else 'Unknown'}",
            "email": "",
            "phone": phone,
            "city": branch or "IVR Call",
            "country": "India",
            "source": "ivr_missed_call",
            "campaign": f"IVR - {status}",
            "platform": "techmet_ivr",
            "extra_data": extra_data
        }
        
        if not phone:
            logger.warning("IVR webhook received without phone number")
            return {"success": False, "message": "Phone number is required"}
        
        try:
            lead_id = await save_lead_to_db(lead_data)
            logger.info(f"IVR lead saved successfully: {lead_id}, phone: {phone}, status: {status}")
        except Exception as e:
            logger.error(f"Failed to save IVR lead: {e}")
            raise HTTPException(status_code=500, detail="Failed to save lead")
        
        if phone:
            asyncio.create_task(send_ivr_routed_whatsapp(phone, lead_id))
        
        # Send to Google Sheets
        sheets_data = {
            "name": lead_data["name"],
            "email": "",
            "phone": phone,
            "city": branch or "IVR",
            "country": "India",
            "date": start_time or datetime.now(timezone.utc).isoformat(),
            "source": f"ivr_missed_call ({status})"
        }
        await send_to_google_sheets(sheets_data)
        
        return {
            "success": True, 
            "lead_id": lead_id, 
            "message": "IVR lead received successfully",
            "phone": phone,
            "status": status
        }
        
    except Exception as e:
        logger.error(f"Error processing IVR webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== FACEBOOK WEBHOOKS ====================

@api_router.get("/webhook/facebook")
async def facebook_webhook_verify(request: Request):
    """
    Facebook Webhook Verification Endpoint
    Facebook will send a GET request with hub.mode, hub.verify_token, and hub.challenge
    """
    params = dict(request.query_params)
    
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    logger.info(f"Facebook webhook verification: mode={mode}, token={token}")
    
    if mode == "subscribe" and token == FB_VERIFY_TOKEN:
        logger.info("Facebook webhook verified successfully!")
        return int(challenge)
    else:
        logger.warning(f"Facebook webhook verification failed. Expected token: {FB_VERIFY_TOKEN}")
        raise HTTPException(status_code=403, detail="Verification failed")


@api_router.post("/webhook/facebook")
async def facebook_webhook_receive(request: Request):
    """
    Receive leads from Facebook Lead Ads
    Facebook sends lead data in a specific format
    """
    try:
        body = await request.body()
        payload = await request.json()
        
        logger.info(f"Facebook webhook received: {json.dumps(payload, indent=2)}")
        
        # Verify signature if FB_APP_SECRET is configured
        if FB_APP_SECRET:
            signature = request.headers.get("X-Hub-Signature-256", "")
            if signature:
                expected_signature = "sha256=" + hmac.new(
                    FB_APP_SECRET.encode(),
                    body,
                    hashlib.sha256
                ).hexdigest()
                
                if not hmac.compare_digest(signature, expected_signature):
                    logger.warning("Invalid Facebook signature")
                    raise HTTPException(status_code=403, detail="Invalid signature")
        
        # Process the webhook payload
        leads_processed = 0
        
        if "entry" in payload:
            for entry in payload.get("entry", []):
                for change in entry.get("changes", []):
                    if change.get("field") == "leadgen":
                        leadgen_data = change.get("value", {})
                        
                        # Extract lead data
                        lead_data = {
                            "name": "",
                            "email": "",
                            "phone": "",
                            "city": "",
                            "country": "",
                            "source": "meta",
                            "platform": "facebook",
                            "campaign": leadgen_data.get("ad_name") or leadgen_data.get("form_name"),
                            "extra_data": {
                                "leadgen_id": leadgen_data.get("leadgen_id"),
                                "page_id": leadgen_data.get("page_id"),
                                "form_id": leadgen_data.get("form_id"),
                                "ad_id": leadgen_data.get("ad_id"),
                                "adgroup_id": leadgen_data.get("adgroup_id"),
                            }
                        }
                        
                        # Parse field_data if present
                        for field in leadgen_data.get("field_data", []):
                            field_name = field.get("name", "").lower()
                            field_values = field.get("values", [])
                            field_value = field_values[0] if field_values else ""
                            
                            if "name" in field_name or "full_name" in field_name:
                                lead_data["name"] = field_value
                            elif "email" in field_name:
                                lead_data["email"] = field_value
                            elif "phone" in field_name:
                                lead_data["phone"] = field_value
                            elif "city" in field_name:
                                lead_data["city"] = field_value
                            elif "country" in field_name:
                                lead_data["country"] = field_value
                        
                        # Save lead
                        try:
                            await save_lead_to_db(lead_data)
                            leads_processed += 1
                            
                            # Send to Google Sheets
                            sheets_data = {
                                "name": lead_data["name"],
                                "email": lead_data["email"],
                                "phone": lead_data["phone"],
                                "city": lead_data["city"],
                                "country": lead_data["country"],
                                "date": datetime.now(timezone.utc).isoformat(),
                                "source": "meta"
                            }
                            await send_to_google_sheets(sheets_data)
                            
                        except Exception as e:
                            logger.error(f"Failed to save Facebook lead: {e}")
        
        return {"success": True, "leads_processed": leads_processed}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        logger.error(f"Facebook webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GOOGLE SHEETS IMPORTER ====================

@api_router.post("/webhook/google")
async def receive_google_lead(payload: dict = {}):
    """Webhook for Google Ads Lead Form Extensions"""
    lead_data = payload.get("lead_form_submission", payload)
    user_data = lead_data.get("user_column_data", [])
    
    field_map = {}
    for item in user_data:
        column_name = item.get("column_name", "").lower()
        value = item.get("string_value", "")
        field_map[column_name] = value
    
    data = {
        "name": field_map.get("full_name") or field_map.get("name") or lead_data.get("name", ""),
        "email": field_map.get("email") or lead_data.get("email", ""),
        "phone": field_map.get("phone_number") or field_map.get("phone") or lead_data.get("phone", ""),
        "city": field_map.get("city") or lead_data.get("city", ""),
        "country": field_map.get("country") or lead_data.get("country", ""),
        "source": "google",
        "campaign": lead_data.get("campaign_id") or lead_data.get("campaign"),
        "platform": "google_ads",
        "extra_data": payload
    }
    
    try:
        lead_id = await save_lead_to_db(data)
    except Exception as e:
        logger.error(f"Failed to save Google lead: {e}")
        raise HTTPException(status_code=500, detail="Failed to save lead")
    
    sheets_data = {
        "name": data["name"],
        "email": data["email"],
        "phone": data["phone"],
        "city": data["city"],
        "country": data["country"],
        "date": datetime.now(timezone.utc).isoformat(),
        "source": "google"
    }
    await send_to_google_sheets(sheets_data)
    
    return {"success": True, "lead_id": lead_id}


@api_router.post("/dashboard/import-sheets", response_model=ImportResult)
async def import_from_google_sheets(
    email: str = Query(...),
    password: str = Query(...),
    sheet_data: List[dict] = []
):
    """
    Import leads from Google Sheets data
    Accepts an array of lead objects from the frontend
    """
    if not verify_credentials(email, password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    imported = 0
    skipped = 0
    
    for row in sheet_data:
        try:
            # Normalize field names (handle different column headers)
            name = row.get("name") or row.get("Name") or row.get("Full Name") or ""
            lead_email = row.get("email") or row.get("Email") or ""
            phone = row.get("phone") or row.get("Phone") or row.get("Mobile") or ""
            city = row.get("city") or row.get("City") or ""
            country = row.get("country") or row.get("Country") or row.get("Country of Interest") or ""
            source = row.get("source") or row.get("Source") or "sheets_import"
            date_str = row.get("date") or row.get("Date") or row.get("Timestamp") or ""
            
            # Skip empty rows
            if not name and not lead_email and not phone:
                skipped += 1
                continue
            
            # Check for duplicates (by email or phone in last 30 days)
            is_duplicate = await check_duplicate_lead(lead_email, phone, hours=720)  # 30 days
            if is_duplicate:
                skipped += 1
                continue
            
            # Parse date if provided
            created_at = datetime.now(timezone.utc)
            if date_str:
                try:
                    # Try common date formats
                    for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%Y-%m-%d"]:
                        try:
                            created_at = datetime.strptime(date_str.split(".")[0], fmt)
                            if created_at.tzinfo is None:
                                created_at = created_at.replace(tzinfo=timezone.utc)
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass
            
            # Save lead
            lead_doc = {
                "lead_id": str(uuid.uuid4()),
                "name": name,
                "email": lead_email,
                "phone": str(phone),
                "city": city,
                "country": country,
                "source": source if source != "sheets_import" else "google_sheets",
                "status": "new",
                "campaign": None,
                "platform": "sheets_import",
                "extra_data": {"imported_from": "google_sheets", "original_row": row},
                "created_at": created_at,
            }
            
            await db.leads.insert_one(lead_doc)
            imported += 1
            
        except Exception as e:
            logger.error(f"Failed to import row: {e}")
            skipped += 1
    
    return ImportResult(
        success=True,
        imported=imported,
        skipped=skipped,
        message=f"Imported {imported} leads, skipped {skipped} (duplicates or empty)"
    )


# ==================== GOOGLE SHEETS AUTO-SYNC ====================

async def fetch_google_sheet_csv(sheet_url: str) -> str:
    """Fetch Google Sheet as CSV using public export URL"""
    # Convert various Google Sheets URL formats to CSV export URL
    sheet_id = None
    
    if "/spreadsheets/d/" in sheet_url:
        # Extract sheet ID from URL
        parts = sheet_url.split("/spreadsheets/d/")
        if len(parts) > 1:
            sheet_id = parts[1].split("/")[0].split("?")[0]
    elif len(sheet_url) == 44 or (len(sheet_url) > 20 and "/" not in sheet_url):
        # Assume it's just the sheet ID
        sheet_id = sheet_url
    
    if not sheet_id:
        raise ValueError("Invalid Google Sheets URL or ID")
    
    # Public CSV export URL (keeps the selected tab when the link has gid=)
    csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    gid_match = re.search(r"[#&?]gid=(\d+)", sheet_url)
    if gid_match:
        csv_url += f"&gid={gid_match.group(1)}"
    
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(csv_url, timeout=30.0)
            if response.status_code == 200:
                return response.text
            else:
                raise HTTPException(status_code=400, detail=f"Failed to fetch sheet: {response.status_code}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Timeout fetching Google Sheet")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sheet: {str(e)}")


def parse_csv_to_leads(csv_text: str) -> List[dict]:
    """Parse CSV text into lead dictionaries"""
    import csv
    from io import StringIO
    
    leads = []
    reader = csv.DictReader(StringIO(csv_text))
    
    for row in reader:
        # Normalize field names (case-insensitive matching)
        normalized = {}
        for key, value in row.items():
            if key:
                key_lower = key.lower().strip()
                normalized[key_lower] = value.strip() if value else ""
        
        # Map to lead fields
        lead = {
            "name": normalized.get("name") or normalized.get("full name") or normalized.get("full_name") or "",
            "email": normalized.get("email") or normalized.get("email address") or "",
            "phone": normalized.get("phone") or normalized.get("phone number") or normalized.get("mobile") or "",
            "city": normalized.get("city") or "",
            "country": normalized.get("country") or normalized.get("country of interest") or "",
            "source": normalized.get("source") or "google_sheets",
            "date": normalized.get("date") or normalized.get("timestamp") or normalized.get("submitted") or "",
        }
        
        # Only add if has at least name, email or phone
        if lead["name"] or lead["email"] or lead["phone"]:
            leads.append(lead)
    
    return leads


@api_router.get("/dashboard/sync-settings")
async def get_sync_settings(email: str = Query(...), password: str = Query(...)):
    """Get Google Sheets sync settings"""
    verify_auth(email, password)
    
    try:
        settings = await db.settings.find_one({"type": "google_sheets_sync"})
        if settings:
            return {
                "google_sheets_url": settings.get("google_sheets_url", ""),
                "auto_sync_enabled": settings.get("auto_sync_enabled", False),
                "sync_interval_minutes": settings.get("sync_interval_minutes", 30),
                "last_sync": settings.get("last_sync"),
                "last_sync_result": settings.get("last_sync_result"),
                "column_mapping": settings.get("column_mapping", {}),
                "extra_columns": settings.get("extra_columns", []),
                "details_columns": settings.get("details_columns", []),
                "default_source": settings.get("default_source", "google_sheets"),
            }
        return {
            "google_sheets_url": "",
            "auto_sync_enabled": False,
            "sync_interval_minutes": 30,
            "last_sync": None,
            "last_sync_result": None,
            "column_mapping": {},
            "extra_columns": [],
            "details_columns": [],
            "default_source": "google_sheets",
        }
    except Exception as e:
        logger.error(f"Error getting sync settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get settings")


@api_router.post("/dashboard/sync-settings")
async def save_sync_settings(
    email: str = Query(...),
    password: str = Query(...),
    google_sheets_url: str = Query(""),
    auto_sync_enabled: bool = Query(False),
    sync_interval_minutes: int = Query(30)
):
    """Save Google Sheets sync settings"""
    verify_auth(email, password)
    
    try:
        update_fields = {
            "type": "google_sheets_sync",
            "auto_sync_enabled": auto_sync_enabled,
            "sync_interval_minutes": sync_interval_minutes,
            "updated_at": datetime.now(timezone.utc),
        }
        # Only overwrite URL when caller actually supplied one — protects against
        # blanking out a previously-saved sheet by accident.
        if google_sheets_url:
            update_fields["google_sheets_url"] = google_sheets_url

        await db.settings.update_one(
            {"type": "google_sheets_sync"},
            {"$set": update_fields},
            upsert=True
        )
        return {"success": True, "message": "Settings saved"}
    except Exception as e:
        logger.error(f"Error saving sync settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")


# ==================== IELTS WHATSAPP TEMPLATE SETTINGS ====================

class IeltsWhatsappTemplatesSettings(BaseModel):
    to_book_template: str = Field(default="", max_length=120)
    pte_others_template: str = Field(default="", max_length=120)
    already_booked_template: str = Field(default="", max_length=120)


@api_router.get("/dashboard/ielts-whatsapp-settings")
async def get_ielts_whatsapp_settings(email: str = Query(...), password: str = Query(...)):
    """Return the admin-configured IELTS Celebration WhatsApp template names."""
    verify_auth(email, password)
    doc = await db.settings.find_one({"type": "ielts_whatsapp_templates"}) or {}
    return {
        "to_book_template": doc.get("to_book_template", ""),
        "pte_others_template": doc.get("pte_others_template", ""),
        "already_booked_template": doc.get("already_booked_template", ""),
        "fallback_template": WHATSAPP_TEMPLATE_NAME,
        "provider": WHATSAPP_PROVIDER,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


@api_router.post("/dashboard/ielts-whatsapp-settings")
async def save_ielts_whatsapp_settings(
    payload: IeltsWhatsappTemplatesSettings,
    email: str = Query(...),
    password: str = Query(...),
):
    """Upsert the IELTS Celebration WhatsApp template names."""
    verify_auth(email, password)
    update_fields = {
        "type": "ielts_whatsapp_templates",
        "to_book_template": payload.to_book_template.strip(),
        "pte_others_template": payload.pte_others_template.strip(),
        "already_booked_template": payload.already_booked_template.strip(),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.settings.update_one(
        {"type": "ielts_whatsapp_templates"},
        {"$set": update_fields},
        upsert=True,
    )
    return {"success": True, "message": "IELTS WhatsApp templates saved"}


# ── University Change WhatsApp settings ─────────────────────────────────
class UcWhatsappTemplatesSettings(BaseModel):
    in_person_template: str = Field(default="", max_length=120)
    telephonic_template: str = Field(default="", max_length=120)
    online_template: str = Field(default="", max_length=120)


@api_router.get("/dashboard/uc-whatsapp-settings")
async def get_uc_whatsapp_settings(email: str = Query(...), password: str = Query(...)):
    """Return the admin-configured University Change WhatsApp template names."""
    verify_auth(email, password)
    doc = await db.settings.find_one({"type": "uc_whatsapp_templates"}) or {}
    return {
        "in_person_template": doc.get("in_person_template", ""),
        "telephonic_template": doc.get("telephonic_template", ""),
        "online_template": doc.get("online_template", ""),
        "provider": WHATSAPP_PROVIDER,
        "key_configured": bool(AISENSY_API_KEY_UC),
        "account_label": "VisaXpert - Berlin" if AISENSY_API_KEY_UC else "",
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


@api_router.post("/dashboard/uc-whatsapp-settings")
async def save_uc_whatsapp_settings(
    payload: UcWhatsappTemplatesSettings,
    email: str = Query(...),
    password: str = Query(...),
):
    """Upsert the University Change WhatsApp template names."""
    verify_auth(email, password)
    update_fields = {
        "type": "uc_whatsapp_templates",
        "in_person_template": payload.in_person_template.strip(),
        "telephonic_template": payload.telephonic_template.strip(),
        "online_template": payload.online_template.strip(),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.settings.update_one(
        {"type": "uc_whatsapp_templates"},
        {"$set": update_fields},
        upsert=True,
    )
    return {"success": True, "message": "University Change WhatsApp templates saved"}


@api_router.post("/dashboard/sheets/preview")
async def preview_google_sheets(
    email: str = Query(...),
    password: str = Query(...),
    sheet_url: str = Query(...),
    sample_size: int = Query(5)
):
    """
    Preview a Google Sheet — returns its header row + a few sample rows so the
    dashboard can show the user a column-mapping UI.
    """
    verify_auth(email, password)
    csv_text = await fetch_google_sheet_csv(sheet_url)

    import csv as _csv
    from io import StringIO

    reader = _csv.reader(StringIO(csv_text))
    rows = list(reader)
    if not rows:
        return {"headers": [], "samples": [], "total_rows": 0}

    headers = [(h or "").strip() for h in rows[0]]
    samples = []
    for r in rows[1: 1 + max(1, min(20, sample_size))]:
        r = list(r) + [""] * (len(headers) - len(r))
        samples.append({headers[i]: (r[i] or "").strip() for i in range(len(headers)) if headers[i]})

    has_online = {h: any("online" in ((r[i] if i < len(r) else "") or "").lower() for r in rows[1:])
                  for i, h in enumerate(headers) if h}
    return {
        "headers": [h for h in headers if h],
        "samples": samples,
        "total_rows": max(0, len(rows) - 1),
        "columns_with_online": [h for h, v in has_online.items() if v],
    }


class ColumnMappingSyncRequest(BaseModel):
    sheet_url: str
    column_mapping: dict = Field(default_factory=dict)
    extra_columns: List[str] = Field(default_factory=list)
    details_columns: List[str] = Field(default_factory=list)
    default_source: str = "google_sheets"
    save_mapping: bool = True


def _parse_flexible_date(date_str: str) -> datetime:
    """Parse various date formats; return UTC datetime, or now() if unparseable."""
    if not date_str:
        return datetime.now(timezone.utc)
    cleaned = date_str.strip()
    # Drop microsecond fragment after dot if it's malformed (e.g. "2026-01-01T10:00:00.000Z")
    if "." in cleaned and ("T" in cleaned or " " in cleaned):
        head, _, tail = cleaned.partition(".")
        # keep trailing tz if any
        m = re.search(r"([Zz]|[+-]\d{2}:?\d{2})$", tail)
        cleaned = head + (m.group(0) if m else "")
    # Normalise timezone offset "+05:30" -> "+0530"
    cleaned = re.sub(r"([+-]\d{2}):(\d{2})$", r"\1\2", cleaned)
    cleaned = cleaned.replace("Z", "+0000")

    fmts = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y-%m-%d",
    ]
    for fmt in fmts:
        try:
            dt = datetime.strptime(cleaned, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return datetime.now(timezone.utc)


@api_router.post("/dashboard/sheets/sync-with-mapping", response_model=ImportResult)
async def sync_sheet_with_mapping(
    payload: ColumnMappingSyncRequest,
    email: str = Query(...),
    password: str = Query(...),
):
    """
    Import leads from a Google Sheet using a user-provided column mapping.

    `column_mapping` is a dict like:
        {
          "name":  "full_name",
          "phone": "phone_number",
          "email": "email",
          "city":  "city",
          "country": "country",
          "source": "platform",
          "date":   "created_time",
          "campaign": "campaign_name",
          "preferred_city": "select_fair_location",
          "unique_id": "id"   # recommended — used for incremental dedupe
        }

    `extra_columns` is a list of additional sheet headers to retain in `extra_data`.
    """
    verify_auth(email, password)
    return await _do_sheet_sync_with_mapping(payload)


async def _do_sheet_sync_with_mapping(payload: "ColumnMappingSyncRequest") -> "ImportResult":
    """Pure sync logic — callable from the API handler AND the background loop."""
    csv_text = await fetch_google_sheet_csv(payload.sheet_url)
    import csv as _csv
    from io import StringIO

    reader = _csv.DictReader(StringIO(csv_text))
    sheet_headers = [h.strip() for h in (reader.fieldnames or []) if h]

    # Build case-insensitive column lookup
    header_lookup = {h.lower(): h for h in sheet_headers}

    def _col_value(row: dict, col_name: str) -> str:
        if not col_name:
            return ""
        if col_name in row and row[col_name] is not None:
            return str(row[col_name]).strip()
        real = header_lookup.get(col_name.strip().lower())
        if real and row.get(real) is not None:
            return str(row[real]).strip()
        return ""

    mapping = {k: (v or "").strip() for k, v in (payload.column_mapping or {}).items()}
    extra_cols = [c for c in (payload.extra_columns or []) if c]
    details_cols = [c for c in (payload.details_columns or []) if c]
    default_source = (payload.default_source or "google_sheets").strip() or "google_sheets"
    unique_id_col = mapping.get("unique_id", "")

    imported = 0
    skipped = 0

    for row in reader:
        try:
            name = _col_value(row, mapping.get("name", ""))
            lead_email = _col_value(row, mapping.get("email", ""))
            phone_raw = _col_value(row, mapping.get("phone", ""))
            sheet_row_id = _col_value(row, unique_id_col) if unique_id_col else ""

            # Clean phone
            phone = re.sub(r"[^\d]", "", phone_raw) if phone_raw else ""
            if phone.startswith("91") and len(phone) > 10:
                phone = phone[2:]
            if phone.startswith("0") and len(phone) > 10:
                phone = phone[1:]

            if not name and not lead_email and not phone and not sheet_row_id:
                skipped += 1
                continue

            # Hard rule for sheet sync: if this phone already exists anywhere
            # in the leads collection (any source, any age), do NOT re-import.
            if phone and await db.leads.find_one({"phone": phone}):
                skipped += 1
                continue

            # Incremental dedupe: if the sheet row has a stable ID, use it.
            # Falls back to email-only window check when no phone is present.
            if sheet_row_id:
                if await db.leads.find_one({"sheet_external_id": sheet_row_id}):
                    skipped += 1
                    continue
            elif not phone and lead_email and await check_duplicate_lead(lead_email, "", hours=720):
                skipped += 1
                continue

            city = _col_value(row, mapping.get("city", ""))
            country = _col_value(row, mapping.get("country", ""))
            campaign = _col_value(row, mapping.get("campaign", ""))
            preferred_city = _col_value(row, mapping.get("preferred_city", ""))
            source = _col_value(row, mapping.get("source", "")) or default_source
            date_str = _col_value(row, mapping.get("date", ""))

            extra_data = {
                "synced_from": "google_sheets",
                "sync_time": datetime.now(timezone.utc).isoformat(),
            }
            for col in extra_cols:
                val = _col_value(row, col)
                if val:
                    extra_data[col] = val
            for col in details_cols:
                val = _col_value(row, col)
                if val:
                    extra_data[col] = val
            if preferred_city:
                extra_data["preferred_city"] = preferred_city

            lead_doc = {
                "lead_id": str(uuid.uuid4()),
                "name": name,
                "email": lead_email,
                "phone": str(phone),
                "city": city,
                "country": country,
                "source": source,
                "status": "new",
                "campaign": campaign or None,
                "platform": "google_sheets_sync",
                "extra_data": extra_data,
                "created_at": _parse_flexible_date(date_str),
            }
            if sheet_row_id:
                lead_doc["sheet_external_id"] = sheet_row_id

            try:
                await db.leads.insert_one(lead_doc)
                imported += 1
            except Exception as insert_err:
                # Likely a race on the unique sheet_external_id index — treat as duplicate
                if "duplicate key" in str(insert_err).lower():
                    skipped += 1
                    continue
                else:
                    raise

            # ---- Trigger downstream campaigns (mirror /webhook/lead behaviour) ----
            campaign_lead_data = {
                "name": name,
                "email": lead_email,
                "phone": phone,
                "city": city,
                "country": country,
                "source": source,
                "campaign": campaign or None,
                "platform": "google_sheets_sync",
                "preferred_city": preferred_city,
            }
            try:
                if source == "germany_fair":
                    if phone:
                        asyncio.create_task(
                            _enqueue_germany_fair_messages(lead_doc["lead_id"], campaign_lead_data)
                        )
                elif phone and source not in ("university_change", "germany_fair"):
                    # Legacy one-shot WhatsApp for any other source (matches webhook)
                    asyncio.create_task(send_whatsapp_template_message(phone, name))
            except Exception as e:
                logger.error(f"Failed to enqueue campaigns for sheet lead: {e}")
        except Exception as e:
            logger.error(f"Failed to import mapped row: {e}")
            skipped += 1

    if payload.save_mapping:
        try:
            await db.settings.update_one(
                {"type": "google_sheets_sync"},
                {
                    "$set": {
                        "type": "google_sheets_sync",
                        "google_sheets_url": payload.sheet_url,
                        "column_mapping": mapping,
                        "extra_columns": extra_cols,
                        "details_columns": details_cols,
                        "default_source": default_source,
                        "last_sync": datetime.now(timezone.utc).isoformat(),
                        "last_sync_result": f"Imported {imported}, skipped {skipped}",
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
                upsert=True,
            )
        except Exception as e:
            logger.error(f"Failed to persist sheet mapping: {e}")

    logger.info(f"Mapped Google Sheets sync done: imported={imported} skipped={skipped}")

    return ImportResult(
        success=True,
        imported=imported,
        skipped=skipped,
        message=f"Sync complete! Imported {imported} new leads, skipped {skipped} (duplicates or empty)",
    )


@api_router.post("/dashboard/sync-google-sheets")
async def sync_google_sheets(
    email: str = Query(...),
    password: str = Query(...),
    sheet_url: Optional[str] = Query(None)
):
    """
    Manually trigger Google Sheets sync.
    Fetches leads from Google Sheet and imports new ones.
    """
    verify_auth(email, password)
    
    try:
        settings = await db.settings.find_one({"type": "google_sheets_sync"})

        # Get sheet URL from settings if not provided
        if not sheet_url and settings:
            sheet_url = settings.get("google_sheets_url")
        
        if not sheet_url:
            raise HTTPException(status_code=400, detail="No Google Sheets URL configured. Please add your Sheet URL in settings.")

        # If user previously saved a column mapping, delegate to the flexible
        # sync endpoint so auto/manual syncs keep using their chosen schema.
        saved_mapping = (settings or {}).get("column_mapping") or {}
        if saved_mapping:
            mapped_payload = ColumnMappingSyncRequest(
                sheet_url=sheet_url,
                column_mapping=saved_mapping,
                extra_columns=(settings or {}).get("extra_columns", []),
                details_columns=(settings or {}).get("details_columns", []),
                default_source=(settings or {}).get("default_source", "google_sheets"),
                save_mapping=True,
            )
            return await sync_sheet_with_mapping(mapped_payload, email=email, password=password)

        # Fetch CSV from Google Sheets
        logger.info(f"Syncing from Google Sheet: {sheet_url}")
        csv_text = await fetch_google_sheet_csv(sheet_url)
        
        # Parse CSV to leads
        leads = parse_csv_to_leads(csv_text)
        logger.info(f"Parsed {len(leads)} leads from sheet")
        
        if not leads:
            return ImportResult(
                success=True,
                imported=0,
                skipped=0,
                message="No leads found in the Google Sheet"
            )
        
        # Import leads (checking for duplicates)
        imported = 0
        skipped = 0
        
        for lead in leads:
            try:
                lead_email = lead.get("email", "")
                phone = lead.get("phone", "")
                
                # Skip empty rows
                if not lead.get("name") and not lead_email and not phone:
                    skipped += 1
                    continue
                
                # Check for duplicates (by email or phone in last 30 days)
                is_duplicate = await check_duplicate_lead(lead_email, phone, hours=720)
                if is_duplicate:
                    skipped += 1
                    continue
                
                # Parse date if provided
                created_at = datetime.now(timezone.utc)
                date_str = lead.get("date", "")
                if date_str:
                    for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"]:
                        try:
                            created_at = datetime.strptime(date_str.split(".")[0].strip(), fmt)
                            if created_at.tzinfo is None:
                                created_at = created_at.replace(tzinfo=timezone.utc)
                            break
                        except ValueError:
                            continue
                
                # Save lead
                lead_doc = {
                    "lead_id": str(uuid.uuid4()),
                    "name": lead.get("name", ""),
                    "email": lead_email,
                    "phone": str(phone),
                    "city": lead.get("city", ""),
                    "country": lead.get("country", ""),
                    "source": "google_sheets",
                    "status": "new",
                    "campaign": "Google Ads",
                    "platform": "google_sheets_sync",
                    "extra_data": {"synced_from": "google_sheets", "sync_time": datetime.now(timezone.utc).isoformat()},
                    "created_at": created_at,
                }
                
                await db.leads.insert_one(lead_doc)
                imported += 1
                
            except Exception as e:
                logger.error(f"Failed to import lead: {e}")
                skipped += 1
        
        # Update last sync time
        sync_result = f"Imported {imported}, skipped {skipped}"
        await db.settings.update_one(
            {"type": "google_sheets_sync"},
            {
                "$set": {
                    "last_sync": datetime.now(timezone.utc).isoformat(),
                    "last_sync_result": sync_result
                }
            },
            upsert=True
        )
        
        logger.info(f"Google Sheets sync complete: {sync_result}")
        
        return ImportResult(
            success=True,
            imported=imported,
            skipped=skipped,
            message=f"Sync complete! Imported {imported} new leads, skipped {skipped} (duplicates or empty)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google Sheets sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ==================== DASHBOARD ENDPOINTS ====================

@api_router.post("/dashboard/login")
async def dashboard_login(request: LoginRequest):
    """Email + Password login for dashboard"""
    user_info = verify_credentials(request.email, request.password)
    if user_info["valid"]:
        token = generate_token(request.email)
        return {
            "success": True,
            "message": "Login successful",
            "token": token,
            "user": {
                "email": user_info["email"],
                "name": user_info["name"],
                "access": user_info["access"]
            }
        }
    raise HTTPException(status_code=401, detail="Invalid email or password")


@api_router.get("/dashboard/verify")
async def verify_login(email: str = Query(...), password: str = Query(...)):
    """Verify dashboard credentials"""
    user_info = verify_credentials(email, password)
    if user_info["valid"]:
        return {
            "valid": True,
            "email": user_info["email"],
            "user": {
                "email": user_info["email"],
                "name": user_info["name"],
                "access": user_info["access"]
            }
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")


@api_router.get("/dashboard/stats")
async def get_dashboard_stats(email: str = Query(...), password: str = Query(...)):
    """Get dashboard statistics - filtered by user access"""
    user_info = verify_auth(email, password)
    source_filter = get_source_filter(user_info)
    
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Apply source filter to all queries
        total_leads = await db.leads.count_documents(source_filter)
        today_filter = {**source_filter, "created_at": {"$gte": today_start}}
        today_leads = await db.leads.count_documents(today_filter)
        
        # Source-specific counts (only if user has access to all or specific sources)
        if user_info["access"] == "all":
            website_leads = await db.leads.count_documents({"source": "website"})
            meta_leads = await db.leads.count_documents({"source": "meta"})
            google_leads = await db.leads.count_documents({"source": {"$in": ["google", "google_sheets"]}})
            university_change_leads = await db.leads.count_documents({"source": "university_change"})
            other_leads = await db.leads.count_documents({"source": {"$nin": ["website", "meta", "google", "google_sheets", "university_change"]}})
        elif user_info["access"] == "university_change":
            website_leads = 0
            meta_leads = 0
            google_leads = 0
            university_change_leads = total_leads
            other_leads = 0
        else:  # main_landing
            website_leads = await db.leads.count_documents({**source_filter, "source": "website"})
            meta_leads = await db.leads.count_documents({**source_filter, "source": "meta"})
            google_leads = await db.leads.count_documents({**source_filter, "source": {"$in": ["google", "google_sheets"]}})
            university_change_leads = 0
            other_leads = await db.leads.count_documents({**source_filter, "source": {"$nin": ["website", "meta", "google", "google_sheets"]}})
        
        return {
            "total_leads": total_leads,
            "today_leads": today_leads,
            "by_source": {
                "website": website_leads,
                "meta": meta_leads,
                "google": google_leads,
                "university_change": university_change_leads,
                "other": other_leads
            },
            "user_access": user_info["access"]
        }
        new_leads = await db.leads.count_documents({"status": "new"})
        contacted_leads = await db.leads.count_documents({"status": "contacted"})
        converted_leads = await db.leads.count_documents({"status": "converted"})
        
        return DashboardStats(
            total_leads=total_leads,
            today_leads=today_leads,
            website_leads=website_leads,
            meta_leads=meta_leads,
            google_leads=google_leads,
            other_leads=other_leads,
            new_leads=new_leads,
            contacted_leads=contacted_leads,
            converted_leads=converted_leads
        )
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")


@api_router.get("/dashboard/leads")
async def get_leads(
    email: str = Query(...),
    password: str = Query(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    source: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc")
):
    """Get paginated list of leads with filters - filtered by user access"""
    user_info = verify_auth(email, password)
    source_filter = get_source_filter(user_info)
    
    try:
        # Start with source filter based on user access
        query = {**source_filter}
        
        # Apply additional filters
        if source:
            if source == "google":
                query["source"] = {"$in": ["google", "google_sheets"]}
            else:
                query["source"] = source
        if status:
            query["status"] = status
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.leads.count_documents(query)
        sort_dir = -1 if sort_order == "desc" else 1
        skip = (page - 1) * per_page
        
        cursor = db.leads.find(query).sort(sort_by, sort_dir).skip(skip).limit(per_page)
        leads_docs = await cursor.to_list(length=per_page)
        
        leads = []
        for doc in leads_docs:
            leads.append(LeadResponse(
                id=doc.get("lead_id", str(doc.get("_id", ""))),
                name=doc.get("name", ""),
                email=doc.get("email", ""),
                phone=doc.get("phone", ""),
                city=doc.get("city", ""),
                country=doc.get("country", ""),
                source=doc.get("source", "website"),
                status=doc.get("status", "new"),
                created_at=doc.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
                campaign=doc.get("campaign"),
                platform=doc.get("platform"),
                extra_data=doc.get("extra_data")
            ))
        
        return LeadsListResponse(
            leads=leads,
            total=total,
            page=page,
            per_page=per_page
        )
    except Exception as e:
        logger.error(f"Error fetching leads: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leads")


@api_router.patch("/dashboard/leads/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    status: str = Query(...),
    email: str = Query(...),
    password: str = Query(...)
):
    """Update lead status"""
    verify_auth(email, password)
    
    if status not in ["new", "contacted", "converted", "closed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    try:
        result = await db.leads.update_one(
            {"lead_id": lead_id},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return {"success": True, "message": f"Status updated to {status}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")


@api_router.delete("/dashboard/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    email: str = Query(...),
    password: str = Query(...)
):
    """Delete a lead"""
    verify_auth(email, password)
    
    try:
        result = await db.leads.delete_one({"lead_id": lead_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return {"success": True, "message": "Lead deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lead: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete lead")


@api_router.post("/dashboard/leads/dedupe-sheets-by-phone")
async def dedupe_sheet_leads_by_phone(
    email: str = Query(...),
    password: str = Query(...),
    dry_run: bool = Query(True),
):
    """
    Find every phone number that appears on more than one lead and delete the
    duplicates whose source is the Google Sheets sync.

    Rules:
      * For each duplicate phone, KEEP the oldest non-sheet lead if one exists
        (so manual / website / Meta / IVR entries are preserved).
      * If all leads for a phone came from sheets, KEEP the oldest sheet lead
        and delete the rest.
      * Only sheet-sourced leads are ever deleted by this endpoint.

    Use `dry_run=true` (default) to preview the impact without touching data.
    """
    verify_auth(email, password)

    def _is_sheet_sourced(lead: dict) -> bool:
        return (
            lead.get("platform") == "google_sheets_sync"
            or lead.get("source") in ("google_sheets", "sheets_import")
            or (lead.get("extra_data") or {}).get("synced_from") == "google_sheets"
        )

    # Step 1: group by phone, find phones with >1 entry
    pipeline = [
        {"$match": {"phone": {"$nin": ["", None]}}},
        {"$group": {"_id": "$phone", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    dup_phones = [d["_id"] for d in await db.leads.aggregate(pipeline).to_list(length=None)]

    to_delete_ids: List[str] = []
    sample_preview: List[dict] = []
    examined = 0

    for phone in dup_phones:
        leads = await db.leads.find({"phone": phone}).sort("created_at", 1).to_list(length=None)
        examined += len(leads)
        non_sheet = [ld for ld in leads if not _is_sheet_sourced(ld)]
        keeper_id = (non_sheet[0] if non_sheet else leads[0]).get("lead_id")

        for ld in leads:
            if ld.get("lead_id") == keeper_id:
                continue
            if _is_sheet_sourced(ld):
                to_delete_ids.append(ld.get("lead_id"))
                if len(sample_preview) < 10:
                    sample_preview.append({
                        "lead_id": ld.get("lead_id"),
                        "name": ld.get("name"),
                        "phone": ld.get("phone"),
                        "source": ld.get("source"),
                        "created_at": ld.get("created_at").isoformat() if isinstance(ld.get("created_at"), datetime) else str(ld.get("created_at")),
                    })

    deleted_count = 0
    if not dry_run and to_delete_ids:
        result = await db.leads.delete_many({"lead_id": {"$in": to_delete_ids}})
        deleted_count = result.deleted_count
        logger.info(f"Sheets-dedupe deleted {deleted_count} duplicate leads by phone")

    return {
        "dry_run": dry_run,
        "duplicate_phones": len(dup_phones),
        "examined_leads": examined,
        "candidates_to_delete": len(to_delete_ids),
        "deleted": deleted_count,
        "sample": sample_preview,
    }


@api_router.get("/dashboard/export")
async def export_leads(
    email: str = Query(...),
    password: str = Query(...),
    source: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """Export leads as JSON"""
    verify_auth(email, password)
    
    try:
        query = {}
        if source:
            query["source"] = source
        if status:
            query["status"] = status
        
        cursor = db.leads.find(query, {"_id": 0}).sort("created_at", -1)
        leads = await cursor.to_list(length=10000)
        
        for lead in leads:
            if isinstance(lead.get("created_at"), datetime):
                lead["created_at"] = lead["created_at"].isoformat()
            if isinstance(lead.get("updated_at"), datetime):
                lead["updated_at"] = lead["updated_at"].isoformat()
        
        return {"leads": leads, "total": len(leads)}
    except Exception as e:
        logger.error(f"Error exporting leads: {e}")
        raise HTTPException(status_code=500, detail="Failed to export leads")


# ==================== SETUP INFO ENDPOINT ====================

@api_router.get("/setup-info")
async def get_setup_info():
    """Return webhook URLs and setup instructions"""
    base_url = os.environ.get("BASE_URL", "https://your-domain.com")
    
    return {
        "webhooks": {
            "universal": f"{base_url}/api/webhook/lead",
            "facebook": f"{base_url}/api/webhook/facebook",
            "google": f"{base_url}/api/webhook/google",
        },
        "facebook_setup": {
            "verify_token": FB_VERIFY_TOKEN,
            "webhook_url": f"{base_url}/api/webhook/facebook",
            "steps": [
                "1. Go to developers.facebook.com and create an app",
                "2. Add 'Webhooks' product to your app",
                "3. Subscribe to 'leadgen' field for your Page",
                f"4. Use verify token: {FB_VERIFY_TOKEN}",
                "5. Connect your Lead Ads form to your Page"
            ]
        },
        "google_sheets_import": {
            "endpoint": f"{base_url}/api/dashboard/import-sheets",
            "steps": [
                "1. Export your Google Sheet as JSON or CSV",
                "2. Use the import feature in dashboard",
                "3. Map columns: name, email, phone, city, country, source, date"
            ]
        }
    }


# ==================== REVIEWS ENDPOINTS ====================

class ReviewCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    country: str = Field(..., min_length=2, max_length=100)
    content: str = Field(..., min_length=10, max_length=1000)
    image_url: Optional[str] = None
    rating: int = Field(default=5, ge=1, le=5)
    page: str = Field(default="main")  # main, university_change, germany_fair

class ReviewResponse(BaseModel):
    review_id: str
    name: str
    country: str
    content: str
    image_url: Optional[str] = None
    rating: int
    page: str
    created_at: str
    is_active: bool

@api_router.get("/reviews")
async def get_reviews(page: Optional[str] = Query(None)):
    """Get all active reviews, optionally filtered by page"""
    try:
        query = {"is_active": True}
        if page:
            query["page"] = page
        cursor = db.reviews.find(query, {"_id": 0}).sort("created_at", -1)
        reviews = await cursor.to_list(length=100)
        for review in reviews:
            if isinstance(review.get("created_at"), datetime):
                review["created_at"] = review["created_at"].isoformat()
        return {"reviews": reviews, "total": len(reviews)}
    except Exception as e:
        logger.error(f"Error fetching reviews: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews")

@api_router.post("/dashboard/reviews")
async def create_review(
    review: ReviewCreate,
    email: str = Query(...),
    password: str = Query(...)
):
    """Create a new review (admin only)"""
    verify_auth(email, password)
    try:
        review_id = str(uuid.uuid4())
        review_doc = {
            "review_id": review_id,
            "name": review.name,
            "country": review.country,
            "content": review.content,
            "image_url": review.image_url or "",
            "rating": review.rating,
            "page": review.page,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
        }
        await db.reviews.insert_one(review_doc)
        logger.info(f"Review created: {review_id} by {review.name}")
        return {"success": True, "review_id": review_id, "message": "Review created successfully"}
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        raise HTTPException(status_code=500, detail="Failed to create review")

@api_router.get("/dashboard/reviews")
async def get_dashboard_reviews(
    email: str = Query(...),
    password: str = Query(...)
):
    """Get all reviews for dashboard management"""
    verify_auth(email, password)
    try:
        cursor = db.reviews.find({}, {"_id": 0}).sort("created_at", -1)
        reviews = await cursor.to_list(length=200)
        for review in reviews:
            if isinstance(review.get("created_at"), datetime):
                review["created_at"] = review["created_at"].isoformat()
        return {"reviews": reviews, "total": len(reviews)}
    except Exception as e:
        logger.error(f"Error fetching reviews: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews")

@api_router.delete("/dashboard/reviews/{review_id}")
async def delete_review(
    review_id: str,
    email: str = Query(...),
    password: str = Query(...)
):
    """Delete a review"""
    verify_auth(email, password)
    try:
        result = await db.reviews.delete_one({"review_id": review_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        return {"success": True, "message": "Review deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting review: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete review")

@api_router.patch("/dashboard/reviews/{review_id}/toggle")
async def toggle_review(
    review_id: str,
    email: str = Query(...),
    password: str = Query(...)
):
    """Toggle review active status"""
    verify_auth(email, password)
    try:
        review = await db.reviews.find_one({"review_id": review_id})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        new_status = not review.get("is_active", True)
        await db.reviews.update_one(
            {"review_id": review_id},
            {"$set": {"is_active": new_status}}
        )
        return {"success": True, "is_active": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling review: {e}")
        raise HTTPException(status_code=500, detail="Failed to toggle review")


# ==================== IMAGE UPLOAD ====================

# Store uploads inside backend/ so they work on VPS with only /api/ proxied.
# Served via FastAPI StaticFiles at /api/uploads/*
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Legacy dir (kept for backward compatibility with previously uploaded images)
LEGACY_UPLOAD_DIR = Path(__file__).parent.parent / "frontend" / "public" / "assets" / "uploads"
LEGACY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_upload(filename: str, content_type: str, contents: bytes) -> str:
    """Persist an uploaded file in MongoDB (durable across pods / deployments)
    and return the public URL served by GET /api/uploads/{filename}."""
    await db.uploaded_files.update_one(
        {"filename": filename},
        {"$set": {
            "filename": filename,
            "content_type": content_type or "application/octet-stream",
            "data": contents,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return f"/api/uploads/{filename}"


@api_router.get("/uploads/{filename:path}")
async def serve_upload(filename: str):
    """Serve an uploaded file. Prefers MongoDB-stored bytes; falls back to any
    legacy files still on disk so old URLs keep working."""
    from fastapi.responses import Response, FileResponse

    doc = await db.uploaded_files.find_one({"filename": filename})
    if doc and doc.get("data") is not None:
        data = doc["data"]
        if not isinstance(data, (bytes, bytearray)):
            data = bytes(data)
        return Response(content=data, media_type=doc.get("content_type", "application/octet-stream"))

    disk_path = UPLOAD_DIR / filename
    if disk_path.exists() and disk_path.is_file():
        return FileResponse(disk_path)
    legacy_path = LEGACY_UPLOAD_DIR / filename
    if legacy_path.exists() and legacy_path.is_file():
        return FileResponse(legacy_path)
    raise HTTPException(status_code=404, detail="File not found")

@api_router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    email: str = Query(...),
    password: str = Query(...)
):
    """Upload an image file and return its URL"""
    verify_auth(email, password)
    
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP and GIF images are allowed")
    
    max_size = 5 * 1024 * 1024  # 5MB
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File size must be under 5MB")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex[:12]}.{ext}"
    image_url = await save_upload(filename, file.content_type, contents)
    logger.info(f"Image uploaded: {image_url}")
    return {"success": True, "image_url": image_url}


# ==================== PAGE LOGOS ====================
# Per-page logo override — lets admin upload a custom logo for each landing page
# (main, germany_fair, university_change). Pages fall back to the default logo if
# no custom one is set.

VALID_LOGO_PAGES = {"main", "germany_fair", "university_change"}

@api_router.get("/page-logos")
async def get_page_logos():
    """Public: return current logo URL per page (no auth)."""
    cursor = db.page_logos.find({}, {"_id": 0})
    docs = await cursor.to_list(length=20)
    out = {p: None for p in VALID_LOGO_PAGES}
    for d in docs:
        page = d.get("page")
        if page in VALID_LOGO_PAGES:
            out[page] = d.get("logo_url")
    return out


@api_router.post("/dashboard/page-logos/upload")
async def upload_page_logo(
    file: UploadFile = File(...),
    page: str = Query(...),
    email: str = Query(...),
    password: str = Query(...),
):
    """Admin: upload a logo for a specific page."""
    verify_auth(email, password)
    if page not in VALID_LOGO_PAGES:
        raise HTTPException(status_code=400, detail=f"page must be one of {sorted(VALID_LOGO_PAGES)}")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, GIF and SVG allowed")

    max_size = 3 * 1024 * 1024  # 3MB for logos
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="Logo must be under 3MB")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "png"
    filename = f"logo-{page}-{uuid.uuid4().hex[:8]}.{ext}"
    logo_url = await save_upload(filename, file.content_type, contents)

    await db.page_logos.update_one(
        {"page": page},
        {"$set": {
            "page": page,
            "logo_url": logo_url,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    logger.info(f"Page logo uploaded: {page} -> {logo_url}")
    return {"success": True, "page": page, "logo_url": logo_url}


@api_router.delete("/dashboard/page-logos/{page}")
async def reset_page_logo(page: str, email: str = Query(...), password: str = Query(...)):
    """Admin: remove custom logo so the page falls back to the default logo."""
    verify_auth(email, password)
    if page not in VALID_LOGO_PAGES:
        raise HTTPException(status_code=400, detail=f"page must be one of {sorted(VALID_LOGO_PAGES)}")
    await db.page_logos.delete_one({"page": page})
    return {"success": True}


# ==================== PARTNER LOGOS (sliding logos per page) ====================
# Admin-uploaded partner/university logos that appear in the sliding carousel on
# each landing page. Each logo can be assigned to one or more pages, like reviews.

@api_router.get("/partner-logos")
async def get_partner_logos(page: Optional[str] = Query(None)):
    """Public: return active partner logos, optionally filtered by page."""
    query = {"is_active": True}
    if page:
        query["pages"] = page
    cursor = db.partner_logos.find(query, {"_id": 0}).sort("created_at", -1)
    logos = await cursor.to_list(length=200)
    for logo in logos:
        if isinstance(logo.get("created_at"), datetime):
            logo["created_at"] = logo["created_at"].isoformat()
    return {"logos": logos, "total": len(logos)}


@api_router.get("/dashboard/partner-logos")
async def dashboard_list_partner_logos(email: str = Query(...), password: str = Query(...)):
    """Admin: list all partner logos (active + hidden)."""
    verify_auth(email, password)
    cursor = db.partner_logos.find({}, {"_id": 0}).sort("created_at", -1)
    logos = await cursor.to_list(length=500)
    for logo in logos:
        if isinstance(logo.get("created_at"), datetime):
            logo["created_at"] = logo["created_at"].isoformat()
    return {"logos": logos, "total": len(logos)}


@api_router.post("/dashboard/partner-logos")
async def create_partner_logo(
    file: UploadFile = File(...),
    name: str = Form(...),
    pages: str = Form(...),  # comma-separated list of page keys
    email: str = Query(...),
    password: str = Query(...),
):
    """Admin: upload a partner logo and attach it to one or more pages."""
    verify_auth(email, password)

    page_list = [p.strip() for p in pages.split(",") if p.strip()]
    if not page_list:
        raise HTTPException(status_code=400, detail="At least one page must be selected")
    invalid = [p for p in page_list if p not in VALID_LOGO_PAGES]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid page(s): {invalid}")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, GIF and SVG allowed")

    max_size = 3 * 1024 * 1024  # 3MB
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="Logo must be under 3MB")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "png"
    filename = f"plogo-{uuid.uuid4().hex[:10]}.{ext}"
    logo_url = await save_upload(filename, file.content_type, contents)

    logo_id = str(uuid.uuid4())
    doc = {
        "logo_id": logo_id,
        "name": name.strip() or "Partner",
        "logo_url": logo_url,
        "pages": page_list,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.partner_logos.insert_one(doc)
    logger.info(f"Partner logo created: {logo_id} for pages {page_list}")
    return {"success": True, "logo_id": logo_id, "logo_url": logo_url}


@api_router.patch("/dashboard/partner-logos/{logo_id}/toggle")
async def toggle_partner_logo(logo_id: str, email: str = Query(...), password: str = Query(...)):
    """Admin: toggle visibility of a partner logo."""
    verify_auth(email, password)
    existing = await db.partner_logos.find_one({"logo_id": logo_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Logo not found")
    new_state = not existing.get("is_active", True)
    await db.partner_logos.update_one({"logo_id": logo_id}, {"$set": {"is_active": new_state}})
    return {"success": True, "is_active": new_state}


@api_router.delete("/dashboard/partner-logos/{logo_id}")
async def delete_partner_logo(logo_id: str, email: str = Query(...), password: str = Query(...)):
    """Admin: delete a partner logo."""
    verify_auth(email, password)
    result = await db.partner_logos.delete_one({"logo_id": logo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Logo not found")
    return {"success": True}


# ==================== SUCCESS STORIES (student visa photos) ====================
# Per-page admin-uploaded student photos (e.g. for /ielts-celebration page).
# Each story = image + name + caption (e.g. "Germany Student Visa, 2025").

VALID_STORY_PAGES = {"ielts_celebration", "main", "germany_fair", "university_change"}


@api_router.get("/success-stories")
async def get_success_stories(page: Optional[str] = Query(None)):
    """Public: list active success stories, optionally filtered by page."""
    query = {"is_active": True}
    if page:
        query["pages"] = page
    cursor = db.success_stories.find(query, {"_id": 0}).sort("created_at", -1)
    stories = await cursor.to_list(length=200)
    for s in stories:
        if isinstance(s.get("created_at"), datetime):
            s["created_at"] = s["created_at"].isoformat()
    return {"stories": stories, "total": len(stories)}


@api_router.get("/dashboard/success-stories")
async def dashboard_list_success_stories(email: str = Query(...), password: str = Query(...)):
    """Admin: list all success stories (active + hidden)."""
    verify_auth(email, password)
    cursor = db.success_stories.find({}, {"_id": 0}).sort("created_at", -1)
    stories = await cursor.to_list(length=500)
    for s in stories:
        if isinstance(s.get("created_at"), datetime):
            s["created_at"] = s["created_at"].isoformat()
    return {"stories": stories, "total": len(stories)}


@api_router.post("/dashboard/success-stories")
async def create_success_story(
    file: UploadFile = File(...),
    name: str = Form(...),
    caption: str = Form(""),
    pages: str = Form("ielts_celebration"),
    email: str = Query(...),
    password: str = Query(...),
):
    """Admin: upload a student success-story image."""
    verify_auth(email, password)

    page_list = [p.strip() for p in pages.split(",") if p.strip()]
    if not page_list:
        raise HTTPException(status_code=400, detail="At least one page must be selected")
    invalid = [p for p in page_list if p not in VALID_STORY_PAGES]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid page(s): {invalid}")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP and GIF allowed")

    max_size = 5 * 1024 * 1024  # 5MB
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    filename = f"story-{uuid.uuid4().hex[:10]}.{ext}"
    image_url = await save_upload(filename, file.content_type, contents)

    story_id = str(uuid.uuid4())
    doc = {
        "story_id": story_id,
        "name": name.strip() or "Student",
        "caption": caption.strip(),
        "image_url": image_url,
        "pages": page_list,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.success_stories.insert_one(doc)
    logger.info(f"Success story created: {story_id} for pages {page_list}")
    return {"success": True, "story_id": story_id, "image_url": image_url}


@api_router.patch("/dashboard/success-stories/{story_id}/toggle")
async def toggle_success_story(story_id: str, email: str = Query(...), password: str = Query(...)):
    """Admin: toggle visibility of a success story."""
    verify_auth(email, password)
    existing = await db.success_stories.find_one({"story_id": story_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Story not found")
    new_state = not existing.get("is_active", True)
    await db.success_stories.update_one({"story_id": story_id}, {"$set": {"is_active": new_state}})
    return {"success": True, "is_active": new_state}


@api_router.delete("/dashboard/success-stories/{story_id}")
async def delete_success_story(story_id: str, email: str = Query(...), password: str = Query(...)):
    """Admin: delete a success story."""
    verify_auth(email, password)
    result = await db.success_stories.delete_one({"story_id": story_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    return {"success": True}




# ==================== WHATSAPP TEMPLATES & SCHEDULER ====================
# Stores user-editable WhatsApp templates and schedules outbound campaign messages
# for Germany Fair leads (5 touchpoints: immediate, 5 days before, 3 days before,
# 1 day before, on event day). Uses Meta Cloud API format via BSP proxy.

# Germany Fair event dates (10:00 UTC works as a reasonable send-time anchor)
GERMANY_FAIR_EVENT_DATES = {
    "Jammu":     datetime(2026, 5, 25, 10, 0, 0, tzinfo=timezone.utc),
    "Pathankot": datetime(2026, 5, 26, 10, 0, 0, tzinfo=timezone.utc),
    "Amritsar":  datetime(2026, 5, 27, 10, 0, 0, tzinfo=timezone.utc),
    "Ludhiana":  datetime(2026, 5, 28, 10, 0, 0, tzinfo=timezone.utc),
}

TRIGGER_TYPES = {"immediate", "days_before", "same_day", "fraction"}
TEMPLATE_CATEGORIES = {"germany_fair", "main_online", "main_offline"}
MEDIA_TYPES = {"image", "video", "document"}

# Branch directory — used by {{branch_address}} / {{branch_phone}} placeholders
# so Main-Page-Offline templates auto-fill the right office details.
BRANCH_DIRECTORY = {
    "Ludhiana": {
        "address": "LGF, SCO-17, Model Town Extension Market, Near Krishna Mandir Rd, Ludhiana, Punjab 141002",
        "phone": "098881 94266",
        "contact_name": "Charu Goyal",
    },
    "Amritsar": {
        "address": "LGF, SCO-21, Block-B, District Shopping Complex, Ranjit Avenue, Amritsar, Punjab 143001",
        "phone": "082848 37654",
        "contact_name": "Dimple Gautam",
    },
    "Pathankot": {
        "address": "Dhangu Rd, opp. Hotel Venice Lane, Jodhamal Colony, Pathankot, Punjab 145001",
        "phone": "080547 78465",
        "contact_name": "Manpreet Kaur",
    },
    "Jammu": {
        "address": "83-B/B, adjoining R K Chouhan Jewellers, Gandhi Nagar, Jammu, J&K 180004",
        "phone": "098788 66657",
        "contact_name": "Chanchaljeet Kaur",
    },
}


def _branch_lookup(lead: dict, field: str) -> str:
    branch = (lead.get("extra_data") or {}).get("preferred_branch") \
        or lead.get("preferred_branch") or lead.get("preferred_city") or ""
    info = BRANCH_DIRECTORY.get(branch)
    return info.get(field, "") if info else ""


PARAM_SOURCES = {
    "name": lambda lead: (lead.get("name") or "there").split(" ")[0],
    "full_name": lambda lead: lead.get("name") or "",
    "city": lambda lead: lead.get("city") or "",
    "preferred_city": lambda lead: lead.get("preferred_city") or "",
    "preferred_branch": lambda lead: (lead.get("extra_data") or {}).get("preferred_branch")
        or lead.get("preferred_branch") or "",
    "branch_address": lambda lead: _branch_lookup(lead, "address"),
    "branch_phone": lambda lead: _branch_lookup(lead, "phone"),
    "branch_contact_name": lambda lead: _branch_lookup(lead, "contact_name"),
    "counselling_mode": lambda lead: (lead.get("extra_data") or {}).get("counselling_mode")
        or lead.get("counselling_mode") or "",
    "event_date": lambda lead: _fair_event_date_str(lead.get("preferred_city") or ""),
    "phone": lambda lead: lead.get("phone") or "",
}

def _fair_event_date_str(city: str) -> str:
    dt = GERMANY_FAIR_EVENT_DATES.get(city)
    if not dt:
        return ""
    return dt.strftime("%dth %B %Y")

def _resolve_param(source: str, lead: dict) -> str:
    """Resolve placeholder source -> string. 'static:xxx' returns 'xxx'."""
    if source.startswith("static:"):
        return source[len("static:"):]
    resolver = PARAM_SOURCES.get(source)
    return resolver(lead) if resolver else ""


class WhatsAppTemplate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)  # display name in dashboard
    wa_template_name: str = Field(..., min_length=1, max_length=100)  # approved template at BSP
    language_code: str = Field(default="en")
    body_params: List[str] = Field(default_factory=list)  # placeholder sources in order
    header_param: Optional[str] = None  # single header parameter source or None
    trigger_type: str = Field(default="immediate")  # immediate | days_before | same_day | fraction
    days_before: int = Field(default=0, ge=0, le=30)  # only for days_before; same_day=0
    fraction: float = Field(default=0.5, ge=0.0, le=1.0)  # only for trigger_type=fraction (0..1 of time between signup and event)
    send_hour_utc: int = Field(default=4, ge=0, le=23)  # 04:00 UTC ≈ 09:30 IST; 4:30 UTC = 10:00 IST
    send_minute_utc: int = Field(default=30, ge=0, le=59)
    active: bool = Field(default=True)
    # Which lead flow this template belongs to. Kept backward-compatible (defaults
    # to germany_fair so existing templates keep firing for Germany Fair leads).
    category: str = Field(default="germany_fair")
    # Optional media for the header (image / video / document). Served from
    # /api/uploads/* so AiSensy can fetch the public URL.
    header_media_url: Optional[str] = None
    header_media_type: Optional[str] = None  # image | video | document

    @field_validator("trigger_type")
    @classmethod
    def validate_trigger(cls, v):
        if v not in TRIGGER_TYPES:
            raise ValueError(f"trigger_type must be one of {TRIGGER_TYPES}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        v = (v or "germany_fair").strip()
        if v not in TEMPLATE_CATEGORIES:
            raise ValueError(f"category must be one of {sorted(TEMPLATE_CATEGORIES)}")
        return v

    @field_validator("header_media_type")
    @classmethod
    def validate_media_type(cls, v):
        if v is None or v == "":
            return None
        if v not in MEDIA_TYPES:
            raise ValueError(f"header_media_type must be one of {sorted(MEDIA_TYPES)}")
        return v


def _format_phone(to_phone: str, default_cc: str = "91") -> str:
    """Return digits-only international number. Numbers written with + or 00 keep
    their own country code; bare local numbers get `default_cc` (91 India, 49 Berlin)."""
    raw = (to_phone or "").strip()
    intl = re.match(r"^\D*(\+|00)", raw) is not None
    formatted = re.sub(r"\D", "", raw)
    if intl and formatted.startswith("00"):
        formatted = formatted[2:]
    if not intl:
        if default_cc == "49":
            if formatted.startswith("0"):
                formatted = "49" + formatted[1:]
            elif not formatted.startswith("49") and len(formatted) in (10, 11):
                formatted = "49" + formatted
        elif len(formatted) == 10:
            formatted = default_cc + formatted
        elif len(formatted) == 11 and formatted.startswith("0"):
            formatted = default_cc + formatted[1:]
    # Country-aware cleanup for every country (e.g. drops the trunk "0" in "+33 06…", keeps Italy's "+39 06…").
    try:
        parsed = phonenumbers.parse("+" + formatted, None)
        if phonenumbers.is_possible_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164).lstrip("+")
    except phonenumbers.NumberParseException:
        pass
    return formatted


async def _send_via_aisensy(to_phone: str, template_name: str, language_code: str,
                            body_params: List[str], header_param: Optional[str],
                            recipient_name: str = "",
                            tags: Optional[List[str]] = None,
                            attributes: Optional[dict] = None,
                            media_url: Optional[str] = None,
                            media_type: Optional[str] = None,
                            api_key_override: Optional[str] = None,
                            button_url_param: Optional[str] = None) -> dict:
    """Send a WhatsApp template message via AiSensy V2 Campaign API.

    NOTE: In AiSensy, `template_name` is the *Campaign Name* you created in the
    AiSensy dashboard (which is tied to an approved template). The API key is a
    JWT and goes in the body as `apiKey`.

    `api_key_override` lets a specific lead source use a different AiSensy
    account (e.g. University Change uses the VisaXpert-Berlin sub-account).
    `button_url_param` is the dynamic URL-button suffix for templates that have
    a CTA URL button with a `{{1}}` variable (used by uc_welcome_online).
    """
    effective_key = (api_key_override or AISENSY_API_KEY or "").strip()
    if not effective_key or not to_phone:
        return {"ok": False, "error": "Missing AiSensy API key or phone"}

    formatted_phone = _format_phone(to_phone, "49" if effective_key == AISENSY_API_KEY_UC else "91")

    media_obj: dict = {}
    if media_url:
        # If a relative /api/uploads/... URL is stored, expand to absolute URL
        # so AiSensy servers can fetch it.
        public_url = media_url
        if public_url.startswith("/"):
            base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
            if not base:
                base = os.environ.get("BASE_URL", "").rstrip("/")
            if base:
                public_url = f"{base}{media_url}"
        media_obj = {"url": public_url, "filename": public_url.split("/")[-1]}

    payload = {
        "apiKey": effective_key,
        "campaignName": template_name,
        "destination": f"+{formatted_phone}",
        "userName": recipient_name or "Lead",
        "templateParams": [str(p) for p in (body_params or [])],
        "source": "visaxpert-website",
        "media": media_obj,
        "buttons": [],
        "carouselCards": [],
        "location": {},
        "attributes": attributes or {},
        "paramsFallbackValue": {"FirstName": recipient_name or "there"},
    }
    if header_param:
        # AiSensy passes header text via attributes for header-param templates
        payload["attributes"]["header"] = str(header_param)
    if tags:
        payload["tags"] = list(tags)
    if button_url_param:
        # Dynamic URL button: AiSensy accepts the URL-suffix variable inside
        # `buttons` as a single text parameter of sub_type "url".
        payload["buttons"] = [{
            "type": "button",
            "sub_type": "url",
            "index": 0,
            "parameters": [{"type": "text", "text": str(button_url_param)}],
        }]

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                AISENSY_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )
            body = {}
            try:
                body = resp.json()
            except Exception:
                body = {"raw": resp.text}
            if 200 <= resp.status_code < 300:
                return {"ok": True, "status": resp.status_code, "response": body}
            return {"ok": False, "status": resp.status_code, "error": str(body)[:500]}
    except Exception as e:
        return {"ok": False, "error": str(e)[:500]}


async def _send_via_bsp(to_phone: str, template_name: str, language_code: str,
                        body_params: List[str], header_param: Optional[str]) -> dict:
    """Legacy nirvachanguru BSP (Meta Cloud-API shape) sender."""
    if not WHATSAPP_ACCESS_TOKEN or not to_phone:
        return {"ok": False, "error": "Missing access token or phone"}

    formatted_phone = _format_phone(to_phone)
    url = f"https://wacrm.nirvachanguru.com/api/meta/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    components = []
    if header_param is not None and str(header_param) != "":
        components.append({
            "type": "header",
            "parameters": [{"type": "text", "text": str(header_param)}],
        })
    if body_params:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": str(p)} for p in body_params],
        })

    template_obj: dict = {"name": template_name, "language": {"code": language_code}}
    if components:
        template_obj["components"] = components

    payload = {
        "messaging_product": "whatsapp",
        "to": formatted_phone,
        "type": "template",
        "template": template_obj,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload, timeout=30)
            body = {}
            try:
                body = resp.json()
            except Exception:
                body = {"raw": resp.text}
            if 200 <= resp.status_code < 300:
                return {"ok": True, "status": resp.status_code, "response": body}
            return {"ok": False, "status": resp.status_code, "error": str(body)[:500]}
    except Exception as e:
        return {"ok": False, "error": str(e)[:500]}


async def _send_whatsapp_api(to_phone: str, template_name: str, language_code: str,
                             body_params: List[str], header_param: Optional[str],
                             recipient_name: str = "",
                             media_url: Optional[str] = None,
                             media_type: Optional[str] = None,
                             api_key_override: Optional[str] = None,
                             button_url_param: Optional[str] = None) -> dict:
    """Unified entry point — dispatches to AiSensy or the legacy BSP based on
    the WHATSAPP_PROVIDER env var."""
    if WHATSAPP_PROVIDER == "aisensy":
        return await _send_via_aisensy(
            to_phone=to_phone,
            template_name=template_name,
            language_code=language_code,
            body_params=body_params,
            header_param=header_param,
            recipient_name=recipient_name,
            media_url=media_url,
            media_type=media_type,
            api_key_override=api_key_override,
            button_url_param=button_url_param,
        )
    return await _send_via_bsp(
        to_phone=to_phone,
        template_name=template_name,
        language_code=language_code,
        body_params=body_params,
        header_param=header_param,
    )


async def _germany_fair_test_mode_enabled() -> bool:
    if db is None:
        return False
    doc = await db.settings.find_one({"type": "germany_fair_test_mode"})
    return bool(doc and doc.get("enabled"))


async def _enqueue_germany_fair_messages(lead_id: str, lead_data: dict):
    """On germany_fair lead, enqueue one scheduled message per active template.

    Supports trigger types: immediate, days_before, same_day, fraction.
    If germany_fair test mode is ON, ALL active templates are scheduled 1 minute
    apart starting from now (regardless of their real trigger_type).
    """
    now = datetime.now(timezone.utc)
    preferred = (lead_data.get("preferred_city") or "").strip()
    event_dt = GERMANY_FAIR_EVENT_DATES.get(preferred)
    test_mode = await _germany_fair_test_mode_enabled()

    # Only germany_fair category templates (missing category = legacy => germany_fair)
    cursor = db.whatsapp_templates.find(
        {"active": True, "$or": [{"category": "germany_fair"}, {"category": {"$exists": False}}]},
        {"_id": 0},
    ).sort("wa_template_name", 1)
    templates = await cursor.to_list(length=200)
    enqueued = 0
    test_index = 0

    for tpl in templates:
        trigger = tpl.get("trigger_type", "immediate")
        send_hour = int(tpl.get("send_hour_utc", 4))
        send_minute = int(tpl.get("send_minute_utc", 30))

        if test_mode:
            # Fire all of them 20 min apart for QA (respects Meta pacing limits better)
            scheduled_at = now + timedelta(minutes=20 * test_index)
            test_index += 1
        elif trigger == "immediate":
            scheduled_at = now
        elif trigger == "fraction":
            if not event_dt:
                continue
            delta = event_dt - now
            if delta.total_seconds() <= 0:
                continue
            fraction = float(tpl.get("fraction", 0.5) or 0.5)
            fraction = max(0.0, min(1.0, fraction))
            scheduled_at = now + timedelta(seconds=delta.total_seconds() * fraction)
            # Pin to the configured hour/minute in UTC
            scheduled_at = scheduled_at.replace(
                hour=send_hour, minute=send_minute, second=0, microsecond=0
            )
            if scheduled_at < now:
                continue
        elif trigger == "same_day":
            if not event_dt:
                continue
            scheduled_at = event_dt.replace(
                hour=send_hour, minute=send_minute, second=0, microsecond=0
            )
            if scheduled_at < now:
                continue
        else:  # days_before
            if not event_dt:
                continue
            days = int(tpl.get("days_before", 1))
            scheduled_at = (event_dt - timedelta(days=days)).replace(
                hour=send_hour, minute=send_minute, second=0, microsecond=0
            )
            if scheduled_at < now:
                continue

        # Resolve parameters now so the lead snapshot is preserved
        body_vals = [_resolve_param(src, lead_data) for src in tpl.get("body_params", [])]
        header_val = _resolve_param(tpl["header_param"], lead_data) if tpl.get("header_param") else None

        doc = {
            "msg_id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "phone": lead_data.get("phone", ""),
            "name": lead_data.get("name", ""),
            "preferred_city": preferred,
            "template_id": tpl.get("template_id", ""),
            "template_display_name": tpl.get("name", ""),
            "wa_template_name": tpl.get("wa_template_name", ""),
            "language_code": tpl.get("language_code", "en"),
            "body_params": body_vals,
            "header_param": header_val,
            "header_media_url": tpl.get("header_media_url"),
            "header_media_type": tpl.get("header_media_type"),
            "trigger_type": trigger,
            "scheduled_at": scheduled_at,
            "status": "pending",
            "attempts": 0,
            "sent_at": None,
            "error": None,
            "response": None,
            "created_at": now,
            "test_mode": test_mode,
        }
        await db.whatsapp_messages.insert_one(doc)
        enqueued += 1
    logger.info(
        f"Enqueued {enqueued} WhatsApp messages for lead {lead_id} "
        f"(city={preferred}, test_mode={test_mode})"
    )
    return enqueued


async def _enqueue_main_landing_messages(lead_id: str, lead_data: dict, mode: str):
    """
    On main landing-page lead, enqueue WhatsApp messages for all active templates
    whose category matches the chosen counselling mode ('online' -> main_online,
    'offline' -> main_offline). Only 'immediate' triggers are honoured here since
    there is no fixed future event date for this flow.
    """
    if db is None:
        return 0
    category = f"main_{mode}"  # main_online or main_offline
    now = datetime.now(timezone.utc)

    cursor = db.whatsapp_templates.find(
        {"active": True, "category": category},
        {"_id": 0},
    )
    templates = await cursor.to_list(length=200)
    enqueued = 0
    for tpl in templates:
        trigger = tpl.get("trigger_type", "immediate")
        # For main-landing flow only "immediate" triggers make sense; skip others
        if trigger != "immediate":
            continue

        body_vals = [_resolve_param(src, lead_data) for src in tpl.get("body_params", [])]
        header_val = _resolve_param(tpl["header_param"], lead_data) if tpl.get("header_param") else None

        doc = {
            "msg_id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "phone": lead_data.get("phone", ""),
            "name": lead_data.get("name", ""),
            "preferred_city": (lead_data.get("extra_data") or {}).get("preferred_branch", ""),
            "template_id": tpl.get("template_id", ""),
            "template_display_name": tpl.get("name", ""),
            "wa_template_name": tpl.get("wa_template_name", ""),
            "language_code": tpl.get("language_code", "en"),
            "body_params": body_vals,
            "header_param": header_val,
            "header_media_url": tpl.get("header_media_url"),
            "header_media_type": tpl.get("header_media_type"),
            "trigger_type": trigger,
            "category": category,
            "scheduled_at": now,
            "status": "pending",
            "attempts": 0,
            "sent_at": None,
            "error": None,
            "response": None,
            "created_at": now,
        }
        await db.whatsapp_messages.insert_one(doc)
        enqueued += 1
    logger.info(f"Enqueued {enqueued} '{category}' WhatsApp messages for lead {lead_id}")
    return enqueued


async def _dispatch_pending_messages():
    """Worker: find pending messages whose time has come and send them."""
    if db is None:
        return
    now = datetime.now(timezone.utc)
    query = {
        "status": "pending",
        "scheduled_at": {"$lte": now},
        "attempts": {"$lt": 3},
    }
    cursor = db.whatsapp_messages.find(query, {"_id": 0})
    batch = await cursor.to_list(length=50)
    for msg in batch:
        msg_id = msg["msg_id"]
        # Claim the message to avoid double-sending under concurrency
        claim = await db.whatsapp_messages.update_one(
            {"msg_id": msg_id, "status": "pending"},
            {"$set": {"status": "sending"}, "$inc": {"attempts": 1}},
        )
        if claim.modified_count == 0:
            continue
        result = await _send_whatsapp_api(
            to_phone=msg["phone"],
            template_name=msg["wa_template_name"],
            language_code=msg.get("language_code", "en"),
            body_params=msg.get("body_params", []),
            header_param=msg.get("header_param"),
            recipient_name=msg.get("name") or "",
            media_url=msg.get("header_media_url"),
            media_type=msg.get("header_media_type"),
        )
        if result.get("ok"):
            await db.whatsapp_messages.update_one(
                {"msg_id": msg_id},
                {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc),
                          "response": result.get("response")}},
            )
            logger.info(f"WhatsApp sent msg_id={msg_id} to {msg['phone']}")
        else:
            attempts = msg.get("attempts", 0) + 1
            final_status = "failed" if attempts >= 3 else "pending"
            await db.whatsapp_messages.update_one(
                {"msg_id": msg_id},
                {"$set": {"status": final_status, "error": result.get("error", "")}},
            )
            logger.warning(f"WhatsApp send failed msg_id={msg_id}: {result.get('error', '')}")


async def _scheduler_loop():
    """Background loop that fires _dispatch_pending_messages() every 60s."""
    logger.info("WhatsApp scheduler loop started")
    while True:
        try:
            await _dispatch_pending_messages()
        except Exception as e:
            logger.error(f"scheduler loop error: {e}")
        try:
            await _maybe_run_auto_sheet_sync()
        except Exception as e:
            logger.error(f"auto sheet sync error: {e}")
        try:
            await _maybe_run_campaign_sheet_sync()
        except Exception as e:
            logger.error(f"campaign sheet sync error: {e}")
        await asyncio.sleep(60)


async def _maybe_run_auto_sheet_sync():
    """If Google Sheets auto-sync is enabled and the interval has elapsed, run it."""
    if db is None:
        return
    settings = await db.settings.find_one({"type": "google_sheets_sync"})
    if not settings:
        return
    if not settings.get("auto_sync_enabled"):
        return
    sheet_url = settings.get("google_sheets_url")
    if not sheet_url:
        return
    mapping = settings.get("column_mapping") or {}
    if not mapping:
        # Without a column mapping we don't know what to import — skip silently
        return

    interval = max(1, int(settings.get("sync_interval_minutes", 30) or 30))
    last_sync_str = settings.get("last_sync")
    if last_sync_str:
        try:
            last = datetime.fromisoformat(last_sync_str.replace("Z", "+00:00"))
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - last).total_seconds() < interval * 60:
                return
        except Exception:
            pass

    payload = ColumnMappingSyncRequest(
        sheet_url=sheet_url,
        column_mapping=mapping,
        extra_columns=settings.get("extra_columns", []) or [],
        details_columns=settings.get("details_columns", []) or [],
        default_source=settings.get("default_source", "google_sheets") or "google_sheets",
        save_mapping=True,
    )
    try:
        result = await _do_sheet_sync_with_mapping(payload)
        logger.info(
            f"Auto sheet sync: imported={result.imported} skipped={result.skipped}"
        )
    except Exception as e:
        logger.error(f"Auto sheet sync failed: {e}")


# ---- Dashboard endpoints for templates & messages ----

@api_router.post("/dashboard/whatsapp/templates")
async def create_wa_template(template: WhatsAppTemplate,
                             email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    doc = template.model_dump()
    doc["template_id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc)
    await db.whatsapp_templates.insert_one(doc)
    doc.pop("_id", None)
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return {"success": True, "template": doc}


@api_router.post("/dashboard/whatsapp/seed-germany-fair")
async def seed_germany_fair_templates(
    email: str = Query(...), password: str = Query(...),
    force: bool = Query(False),
):
    """
    Create 6 draft Germany Fair templates (1 immediate + 4 days-before + 1 on-event-day).
    Each is created as INACTIVE with a placeholder wa_template_name so the admin
    can edit, drop in the real BSP template name, adjust days_before if needed,
    and flip Active → on.
    Skips creation if germany_fair templates already exist, unless force=true.
    """
    verify_auth(email, password)

    existing = await db.whatsapp_templates.count_documents({"category": "germany_fair"})
    if existing > 0 and not force:
        return {
            "success": False,
            "created": 0,
            "message": f"{existing} Germany Fair template(s) already exist. Pass force=true to add another set.",
        }

    drafts = [
        {
            "name": "GF 1 — Welcome (immediate)",
            "wa_template_name": "REPLACE_ME_welcome",
            "trigger_type": "immediate",
            "days_before": 0,
            "body_params": ["name", "preferred_city", "event_date"],
        },
        {
            "name": "GF 2 — Reminder (15 days before)",
            "wa_template_name": "REPLACE_ME_15d",
            "trigger_type": "days_before",
            "days_before": 15,
            "body_params": ["name", "event_date"],
        },
        {
            "name": "GF 3 — Reminder (7 days before)",
            "wa_template_name": "REPLACE_ME_7d",
            "trigger_type": "days_before",
            "days_before": 7,
            "body_params": ["name", "event_date"],
        },
        {
            "name": "GF 4 — Reminder (3 days before)",
            "wa_template_name": "REPLACE_ME_3d",
            "trigger_type": "days_before",
            "days_before": 3,
            "body_params": ["name", "event_date"],
        },
        {
            "name": "GF 5 — Reminder (1 day before)",
            "wa_template_name": "REPLACE_ME_1d",
            "trigger_type": "days_before",
            "days_before": 1,
            "body_params": ["name", "event_date"],
        },
        {
            "name": "GF 6 — On Event Day",
            "wa_template_name": "REPLACE_ME_event_day",
            "trigger_type": "same_day",
            "days_before": 0,
            "body_params": ["name", "preferred_city"],
        },
    ]

    now = datetime.now(timezone.utc)
    created_docs = []
    for d in drafts:
        doc = {
            "template_id": str(uuid.uuid4()),
            "name": d["name"],
            "wa_template_name": d["wa_template_name"],
            "language_code": "en",
            "body_params": d["body_params"],
            "header_param": None,
            "trigger_type": d["trigger_type"],
            "days_before": d["days_before"],
            "send_hour_utc": 4,  # 04:00 UTC = 09:30 IST
            "active": False,     # start inactive — admin flips on after setting names
            "category": "germany_fair",
            "created_at": now,
        }
        await db.whatsapp_templates.insert_one(doc)
        doc.pop("_id", None)
        doc["created_at"] = doc["created_at"].isoformat()
        created_docs.append(doc)

    return {
        "success": True,
        "created": len(created_docs),
        "templates": created_docs,
        "message": "6 Germany Fair drafts created. Edit each → set 'WhatsApp Template Name (BSP)' → toggle Active ✓.",
    }


@api_router.get("/dashboard/whatsapp/templates")
async def list_wa_templates(email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    cursor = db.whatsapp_templates.find({}, {"_id": 0}).sort("created_at", -1)
    tpls = await cursor.to_list(length=200)
    for t in tpls:
        if isinstance(t.get("created_at"), datetime):
            t["created_at"] = t["created_at"].isoformat()
    return {"templates": tpls, "total": len(tpls)}


@api_router.patch("/dashboard/whatsapp/templates/{template_id}")
async def update_wa_template(template_id: str, template: WhatsAppTemplate,
                             email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    update = template.model_dump()
    res = await db.whatsapp_templates.update_one(
        {"template_id": template_id},
        {"$set": update},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True}


@api_router.delete("/dashboard/whatsapp/templates/{template_id}")
async def delete_wa_template(template_id: str,
                             email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    res = await db.whatsapp_templates.delete_one({"template_id": template_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    # Cancel any pending messages that used this template
    await db.whatsapp_messages.update_many(
        {"template_id": template_id, "status": "pending"},
        {"$set": {"status": "cancelled"}},
    )
    return {"success": True}


@api_router.get("/dashboard/whatsapp/messages")
async def list_wa_messages(
    email: str = Query(...), password: str = Query(...),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    verify_auth(email, password)
    query = {}
    if status:
        query["status"] = status
    cursor = db.whatsapp_messages.find(query, {"_id": 0}).sort("scheduled_at", -1)
    msgs = await cursor.to_list(length=limit)
    for m in msgs:
        for k in ("scheduled_at", "sent_at", "created_at"):
            if isinstance(m.get(k), datetime):
                m[k] = m[k].isoformat()
    return {"messages": msgs, "total": len(msgs)}


@api_router.post("/dashboard/whatsapp/test")
async def send_wa_test(
    payload: dict,
    email: str = Query(...), password: str = Query(...),
):
    """Send a one-off test message using a stored template and sample params."""
    verify_auth(email, password)
    template_id = payload.get("template_id")
    to_phone = payload.get("phone")
    test_name = payload.get("name") or "Test User"
    test_city = payload.get("preferred_city") or "Jammu"
    if not template_id or not to_phone:
        raise HTTPException(status_code=400, detail="template_id and phone required")

    tpl = await db.whatsapp_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    fake_lead = {"name": test_name, "phone": to_phone, "city": test_city,
                 "preferred_city": test_city}
    body_vals = [_resolve_param(s, fake_lead) for s in tpl.get("body_params", [])]
    header_val = _resolve_param(tpl["header_param"], fake_lead) if tpl.get("header_param") else None

    result = await _send_whatsapp_api(
        to_phone=to_phone,
        template_name=tpl["wa_template_name"],
        language_code=tpl.get("language_code", "en"),
        body_params=body_vals,
        header_param=header_val,
        recipient_name=test_name,
        media_url=tpl.get("header_media_url"),
        media_type=tpl.get("header_media_type"),
    )
    return {"result": result, "resolved_body_params": body_vals, "resolved_header": header_val}


@api_router.post("/dashboard/whatsapp/messages/{msg_id}/retry")
async def retry_wa_message(msg_id: str,
                           email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    res = await db.whatsapp_messages.update_one(
        {"msg_id": msg_id, "status": {"$in": ["failed", "cancelled"]}},
        {"$set": {"status": "pending", "attempts": 0, "error": None,
                  "scheduled_at": datetime.now(timezone.utc)}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found or already pending/sent")
    return {"success": True}


@api_router.delete("/dashboard/whatsapp/messages/{msg_id}")
async def cancel_wa_message(msg_id: str,
                            email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    res = await db.whatsapp_messages.update_one(
        {"msg_id": msg_id, "status": "pending"},
        {"$set": {"status": "cancelled"}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found or not pending")
    return {"success": True}


@api_router.get("/dashboard/whatsapp/meta")
async def wa_meta_info(email: str = Query(...), password: str = Query(...)):
    """Expose available placeholder sources and fair cities to the dashboard UI."""
    verify_auth(email, password)
    return {
        "placeholder_sources": list(PARAM_SOURCES.keys()) + ["static:..."],
        "trigger_types": sorted(TRIGGER_TYPES),
        "categories": sorted(TEMPLATE_CATEGORIES),
        "fair_event_dates": {k: v.isoformat() for k, v in GERMANY_FAIR_EVENT_DATES.items()},
        "provider": WHATSAPP_PROVIDER,
        "provider_configured": bool(
            AISENSY_API_KEY if WHATSAPP_PROVIDER == "aisensy" else WHATSAPP_ACCESS_TOKEN
        ),
    }


@api_router.get("/dashboard/whatsapp/gf-test-mode")
async def gf_get_test_mode(email: str = Query(...), password: str = Query(...)):
    """Germany Fair testing mode: when ON, every new germany_fair lead gets all
    6 messages fired 1 min apart (ignores the real schedule)."""
    verify_auth(email, password)
    doc = await db.settings.find_one({"type": "germany_fair_test_mode"}, {"_id": 0})
    return {
        "enabled": bool(doc and doc.get("enabled")),
        "updated_at": (doc or {}).get("updated_at").isoformat()
            if doc and isinstance(doc.get("updated_at"), datetime) else None,
    }


@api_router.post("/dashboard/whatsapp/gf-test-mode")
async def gf_set_test_mode(
    payload: dict,
    email: str = Query(...), password: str = Query(...),
):
    verify_auth(email, password)
    enabled = bool(payload.get("enabled"))
    await db.settings.update_one(
        {"type": "germany_fair_test_mode"},
        {"$set": {
            "type": "germany_fair_test_mode",
            "enabled": enabled,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"success": True, "enabled": enabled}


@api_router.post("/dashboard/whatsapp/upload-media")
async def upload_whatsapp_media(
    file: UploadFile = File(...),
    email: str = Query(...),
    password: str = Query(...),
):
    """Upload an image or video for a WhatsApp template header. Returns a public URL."""
    verify_auth(email, password)

    allowed_images = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    allowed_videos = {"video/mp4", "video/quicktime", "video/3gpp", "video/webm"}
    allowed = allowed_images | allowed_videos

    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG/PNG/WEBP/GIF images and MP4/MOV/3GP/WEBM videos allowed",
        )

    # 5MB images / 16MB videos
    max_size = 16 * 1024 * 1024 if file.content_type in allowed_videos else 5 * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"File must be under {max_mb}MB")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    filename = f"wa-{uuid.uuid4().hex[:12]}.{ext}"
    media_type = "video" if file.content_type in allowed_videos else "image"
    media_url = await save_upload(filename, file.content_type, contents)
    logger.info(f"WhatsApp media uploaded: {media_type} -> {media_url}")
    return {"success": True, "media_url": media_url, "media_type": media_type}


# ==================== UNIVERSITY CHANGE / BERLIN BOOKINGS ====================
# Booking calendar for /berlin (formerly /university-change) page.
# Public: list availability for a date, create a booking.
# Admin: configure working hours/days/slot length, open dates as one or two
# explicit calendar ranges (with a gap), toggle individual slots, list bookings.
# On booking creation, 4 emails are queued:
#   1. uc_booking_confirm       (immediate)
#   2. uc_booking_reminder_24h  (T-24h)
#   3. uc_booking_reminder_1h   (T-1h)
#   4. uc_booking_followup      (T+1h)
# All times are interpreted in Europe/Berlin (handles CET/CEST automatically).

BERLIN_TZ = ZoneInfo("Europe/Berlin")

UC_BOOKING_DEFAULT_SETTINGS = {
    "working_days": [0, 1, 2, 3, 4, 5],  # 0=Mon ... 5=Sat
    "start_time": "10:00",
    "end_time": "19:00",
    "slot_minutes": 30,
    "advance_days": 30,
    "min_lead_minutes": 60,
    # Optional explicit open windows. List of {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}.
    # Up to 2 ranges supported (with a gap between them). If empty, falls back
    # to the rolling `advance_days` behavior from today.
    "open_ranges": [],
}

UC_SETTINGS_KEYS = ("working_days", "start_time", "end_time", "slot_minutes",
                    "advance_days", "min_lead_minutes", "open_ranges")


def _uc_settings_or_default(settings: Optional[dict]) -> dict:
    base = dict(UC_BOOKING_DEFAULT_SETTINGS)
    if settings:
        for k in UC_SETTINGS_KEYS:
            if k in settings and settings[k] is not None:
                base[k] = settings[k]
    return base


def _hhmm_to_minutes(s: str) -> int:
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def _minutes_to_hhmm(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


def _ist_local_to_utc(date_str: str, time_str: str) -> datetime:
    """Convert a wall-clock time in Europe/Berlin to UTC.
    Function name kept for backward compatibility with existing callers."""
    y, mo, d = [int(x) for x in date_str.split("-")]
    h, mi = [int(x) for x in time_str.split(":")]
    local = datetime(y, mo, d, h, mi, tzinfo=BERLIN_TZ)
    return local.astimezone(timezone.utc)


def _generate_uc_slots(date_str: str, settings: dict) -> List[str]:
    y, mo, d = [int(x) for x in date_str.split("-")]
    weekday = datetime(y, mo, d).weekday()
    if weekday not in settings["working_days"]:
        return []
    start = _hhmm_to_minutes(settings["start_time"])
    end = _hhmm_to_minutes(settings["end_time"])
    slot = max(5, int(settings["slot_minutes"]))
    out = []
    t = start
    while t + slot <= end:
        out.append(_minutes_to_hhmm(t))
        t += slot
    return out


async def _uc_get_settings_doc() -> dict:
    if db is None:
        return _uc_settings_or_default(None)
    doc = await db.uc_booking_settings.find_one({"type": "uc_booking"})
    return _uc_settings_or_default(doc)


async def _uc_get_disabled_slots(date_str: str) -> set:
    if db is None:
        return set()
    cur = db.uc_slot_overrides.find(
        {"date": date_str, "disabled": True}, {"_id": 0, "time": 1}
    )
    rows = await cur.to_list(length=200)
    return {r["time"] for r in rows}


async def _uc_get_booked_slots(date_str: str) -> set:
    if db is None:
        return set()
    cur = db.uc_bookings.find(
        {"slot_date": date_str, "status": "confirmed"},
        {"_id": 0, "slot_time": 1},
    )
    rows = await cur.to_list(length=500)
    return {r["slot_time"] for r in rows}


class UCBookingSettingsIn(BaseModel):
    working_days: Optional[List[int]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_minutes: Optional[int] = None
    advance_days: Optional[int] = None
    min_lead_minutes: Optional[int] = None
    open_ranges: Optional[List[dict]] = None  # [{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}, ...]


class UCSlotToggleIn(BaseModel):
    date: str
    time: str
    disabled: bool


class UCBookingCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    slot_date: str
    slot_time: str
    notes: Optional[str] = ""
    current_university: Optional[str] = ""
    transfer_type: Optional[str] = ""


def _fmt_booking_when(slot_date: str, slot_time: str) -> str:
    y, mo, d = [int(x) for x in slot_date.split("-")]
    h, mi = [int(x) for x in slot_time.split(":")]
    dt = datetime(y, mo, d, h, mi, tzinfo=BERLIN_TZ)
    # Use CET/CEST suffix (zoneinfo gives the correct one automatically)
    tz_label = dt.tzname() or "Berlin"
    return dt.strftime("%A, %d %B %Y at %I:%M %p ") + tz_label


# ---- Public endpoints ----

@api_router.get("/uc-bookings/availability")
async def uc_availability(date: str):
    """Public: slots for a given IST date with status."""
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        raise HTTPException(status_code=400, detail="invalid date (YYYY-MM-DD)")
    settings = await _uc_get_settings_doc()
    slots = _generate_uc_slots(date, settings)
    if not slots:
        return {"date": date, "working_day": False, "slots": [], "settings": settings}
    disabled = await _uc_get_disabled_slots(date)
    booked = await _uc_get_booked_slots(date)
    now_utc = datetime.now(timezone.utc)
    min_lead = timedelta(minutes=int(settings.get("min_lead_minutes") or 60))
    out = []
    for t in slots:
        if t in booked:
            status = "booked"
        elif t in disabled:
            status = "disabled"
        else:
            slot_utc = _ist_local_to_utc(date, t)
            status = "past" if (slot_utc - now_utc) < min_lead else "available"
        out.append({"time": t, "status": status})
    return {"date": date, "working_day": True, "slots": out, "settings": settings}


@api_router.get("/uc-bookings/days")
async def uc_days(month: str):
    """Public: list of bookable dates in month YYYY-MM (Berlin local)."""
    if not re.match(r"^\d{4}-\d{2}$", month):
        raise HTTPException(status_code=400, detail="invalid month (YYYY-MM)")
    y, mo = [int(x) for x in month.split("-")]
    settings = await _uc_get_settings_doc()
    if mo == 12:
        last = (datetime(y + 1, 1, 1) - timedelta(days=1)).day
    else:
        last = (datetime(y, mo + 1, 1) - timedelta(days=1)).day
    today_local = datetime.now(BERLIN_TZ).date()
    advance = int(settings.get("advance_days") or 30)

    # Build the set of "open" date predicates.
    # If admin configured explicit open_ranges, use those (union of ranges).
    # Otherwise fall back to rolling [today, today + advance_days].
    open_ranges = settings.get("open_ranges") or []

    def _is_open_date(dt) -> bool:
        if dt < today_local:
            return False
        if not open_ranges:
            return dt <= today_local + timedelta(days=advance)
        for r in open_ranges:
            try:
                rs = datetime.strptime(r.get("start", ""), "%Y-%m-%d").date()
                re_ = datetime.strptime(r.get("end", ""), "%Y-%m-%d").date()
            except Exception:
                continue
            if rs <= dt <= re_:
                return True
        return False

    days = []
    for d in range(1, last + 1):
        dt = datetime(y, mo, d).date()
        if not _is_open_date(dt):
            continue
        if dt.weekday() in settings["working_days"]:
            days.append(dt.isoformat())
    return {
        "month": month,
        "days": days,
        "advance_days": advance,
        "open_ranges": open_ranges,
        "today": today_local.isoformat(),
    }


@api_router.post("/uc-bookings/create")
async def uc_create_booking(payload: UCBookingCreate):
    """Public: book a slot. Sends 1 confirm email + schedules 3 follow-ups."""
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", payload.slot_date):
        raise HTTPException(status_code=400, detail="invalid slot_date")
    if not re.match(r"^\d{2}:\d{2}$", payload.slot_time):
        raise HTTPException(status_code=400, detail="invalid slot_time")
    if len(payload.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="name too short")
    if len(payload.phone.strip()) < 7:
        raise HTTPException(status_code=400, detail="phone too short")

    settings = await _uc_get_settings_doc()
    valid_slots = _generate_uc_slots(payload.slot_date, settings)
    if payload.slot_time not in valid_slots:
        raise HTTPException(status_code=400, detail="slot not offered on that day")

    disabled = await _uc_get_disabled_slots(payload.slot_date)
    if payload.slot_time in disabled:
        raise HTTPException(status_code=409, detail="slot is disabled by admin")

    slot_utc = _ist_local_to_utc(payload.slot_date, payload.slot_time)
    now_utc = datetime.now(timezone.utc)
    min_lead = timedelta(minutes=int(settings.get("min_lead_minutes") or 60))
    if (slot_utc - now_utc) < min_lead:
        raise HTTPException(status_code=409, detail="slot is in the past or too soon")

    booking_id = str(uuid.uuid4())
    doc = {
        "booking_id": booking_id,
        "name": payload.name.strip(),
        "email": payload.email,
        "phone": payload.phone.strip(),
        "slot_date": payload.slot_date,
        "slot_time": payload.slot_time,
        "slot_dt_utc": slot_utc,
        "notes": (payload.notes or "").strip(),
        "current_university": (payload.current_university or "").strip(),
        "transfer_type": (payload.transfer_type or "").strip(),
        "status": "confirmed",
        "source": "university_change",
        "created_at": now_utc,
    }
    try:
        await db.uc_bookings.insert_one(doc)
    except Exception as e:
        msg = str(e).lower()
        if "duplicate" in msg or "e11000" in msg:
            raise HTTPException(status_code=409, detail="slot just got booked")
        raise

    # Mirror into leads collection so dashboard sees it. To avoid the same
    # visitor being counted twice on the dashboard (form-fill lead + booking
    # lead), we first try to UPDATE an existing university_change lead that
    # matches this email/phone in the last 24 hours. Only if none exists do
    # we insert a fresh lead row.
    try:
        cutoff = now_utc - timedelta(hours=24)
        match_or = []
        if doc["email"]:
            match_or.append({"email": doc["email"]})
        if doc["phone"]:
            match_or.append({"phone": doc["phone"]})
        existing_lead = None
        if match_or:
            existing_lead = await db.leads.find_one({
                "source": "university_change",
                "created_at": {"$gte": cutoff},
                "$or": match_or,
            }, sort=[("created_at", -1)])

        booking_extra = {
            "booking_id": booking_id,
            "slot_date": payload.slot_date,
            "slot_time": payload.slot_time,
            "current_university": doc["current_university"],
            "transfer_type": doc["transfer_type"],
            "notes": doc["notes"],
        }

        if existing_lead:
            # Merge booking info into the existing lead's extra_data
            merged_extra = {**(existing_lead.get("extra_data") or {}), **booking_extra}
            await db.leads.update_one(
                {"_id": existing_lead["_id"]},
                {"$set": {
                    "extra_data": merged_extra,
                    "campaign": existing_lead.get("campaign") or "UC Booking",
                }},
            )
        else:
            await db.leads.insert_one({
                "lead_id": str(uuid.uuid4()),
                "name": doc["name"],
                "email": doc["email"],
                "phone": doc["phone"],
                "city": "",
                "country": "Germany",
                "source": "university_change",
                "campaign": "UC Booking",
                "platform": "website",
                "status": "new",
                "extra_data": booking_extra,
                "created_at": now_utc,
            })
    except Exception as e:
        logger.warning(f"UC booking: failed to mirror to leads: {e}")

    return {
        "success": True,
        "booking_id": booking_id,
        "slot_date": payload.slot_date,
        "slot_time": payload.slot_time,
    }


# ---- Admin endpoints ----

# ==================== UC APPOINTMENT TOGGLE ====================
# Simple on/off flag controlled from dashboard. When OFF, the Berlin
# /university-change form only collects the lead's details and skips the
# appointment booking modal entirely.

async def _uc_appointment_toggle_enabled() -> bool:
    # PERMANENTLY DISABLED from the backend. The Berlin (/university-change)
    # form must only collect the visitor's details — the booking modal is
    # switched off site-wide until this constant is flipped back.
    return False


@api_router.get("/uc-appointment-toggle")
async def public_get_uc_appointment_toggle():
    """Public read-only endpoint consumed by the /berlin (university-change) page."""
    return {"enabled": await _uc_appointment_toggle_enabled(), "locked": True}


@api_router.get("/dashboard/uc-appointment-toggle")
async def admin_get_uc_appointment_toggle(email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    return {"enabled": await _uc_appointment_toggle_enabled(), "locked": True}


class UCAppointmentToggleIn(BaseModel):
    enabled: bool


@api_router.post("/dashboard/uc-appointment-toggle")
async def admin_set_uc_appointment_toggle(payload: UCAppointmentToggleIn,
                                          email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    # Locked OFF at the backend level — accept the call but always report
    # `enabled: false` so the dashboard UI and the Berlin page stay in sync.
    return {"success": False, "enabled": False, "locked": True,
            "message": "Appointment booking is permanently disabled from the backend."}


@api_router.get("/dashboard/uc-bookings/settings")
async def uc_admin_get_settings(email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    return await _uc_get_settings_doc()


@api_router.post("/dashboard/uc-bookings/settings")
async def uc_admin_save_settings(payload: UCBookingSettingsIn,
                                  email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    existing = await db.uc_booking_settings.find_one({"type": "uc_booking"}) or {}
    merged = _uc_settings_or_default(existing)
    update_data = payload.model_dump(exclude_unset=True, exclude_none=True)
    merged.update(update_data)
    if not (0 < merged["slot_minutes"] <= 240):
        raise HTTPException(status_code=400, detail="slot_minutes must be 1-240")
    if _hhmm_to_minutes(merged["start_time"]) >= _hhmm_to_minutes(merged["end_time"]):
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    if not all(0 <= d <= 6 for d in merged["working_days"]):
        raise HTTPException(status_code=400, detail="working_days must be 0-6")
    # Validate open_ranges (optional, max 2 ranges, ascending, no overlap)
    raw_ranges = merged.get("open_ranges") or []
    if not isinstance(raw_ranges, list):
        raise HTTPException(status_code=400, detail="open_ranges must be a list")
    if len(raw_ranges) > 2:
        raise HTTPException(status_code=400, detail="up to 2 open ranges supported")
    cleaned = []
    for r in raw_ranges:
        if not isinstance(r, dict):
            raise HTTPException(status_code=400, detail="open_ranges entries must be objects")
        s = (r.get("start") or "").strip()
        e = (r.get("end") or "").strip()
        if not (re.match(r"^\d{4}-\d{2}-\d{2}$", s) and re.match(r"^\d{4}-\d{2}-\d{2}$", e)):
            raise HTTPException(status_code=400, detail="open_ranges dates must be YYYY-MM-DD")
        try:
            sd = datetime.strptime(s, "%Y-%m-%d").date()
            ed = datetime.strptime(e, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="open_ranges dates invalid")
        if sd > ed:
            raise HTTPException(status_code=400, detail="open_range start must be <= end")
        cleaned.append({"start": s, "end": e})
    cleaned.sort(key=lambda x: x["start"])
    if len(cleaned) == 2:
        first_end = datetime.strptime(cleaned[0]["end"], "%Y-%m-%d").date()
        second_start = datetime.strptime(cleaned[1]["start"], "%Y-%m-%d").date()
        if second_start <= first_end:
            raise HTTPException(status_code=400, detail="the two open ranges must not overlap and need a gap")
    merged["open_ranges"] = cleaned
    merged["updated_at"] = datetime.now(timezone.utc)
    await db.uc_booking_settings.update_one(
        {"type": "uc_booking"},
        {"$set": {**merged, "type": "uc_booking"}},
        upsert=True,
    )
    return {"success": True, "settings": _uc_settings_or_default(merged)}


@api_router.get("/dashboard/uc-bookings/slots")
async def uc_admin_get_day(date: str,
                            email: str = Query(...), password: str = Query(...)):
    """Admin view of one day: every slot's state + booking (if any)."""
    verify_auth(email, password)
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        raise HTTPException(status_code=400, detail="invalid date")
    settings = await _uc_get_settings_doc()
    slots = _generate_uc_slots(date, settings)
    disabled = await _uc_get_disabled_slots(date)
    booked_cur = db.uc_bookings.find(
        {"slot_date": date, "status": "confirmed"}, {"_id": 0}
    )
    bookings_by_time = {b["slot_time"]: b for b in await booked_cur.to_list(length=500)}
    out = []
    for t in slots:
        bk = bookings_by_time.get(t)
        if bk:
            if isinstance(bk.get("slot_dt_utc"), datetime):
                bk["slot_dt_utc"] = bk["slot_dt_utc"].isoformat()
            if isinstance(bk.get("created_at"), datetime):
                bk["created_at"] = bk["created_at"].isoformat()
        out.append({"time": t, "disabled": t in disabled, "booking": bk})
    return {"date": date, "working_day": bool(slots), "slots": out, "settings": settings}


@api_router.post("/dashboard/uc-bookings/slots/toggle")
async def uc_admin_toggle_slot(payload: UCSlotToggleIn,
                                email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", payload.date):
        raise HTTPException(status_code=400, detail="invalid date")
    if not re.match(r"^\d{2}:\d{2}$", payload.time):
        raise HTTPException(status_code=400, detail="invalid time")
    await db.uc_slot_overrides.update_one(
        {"date": payload.date, "time": payload.time},
        {"$set": {
            "date": payload.date,
            "time": payload.time,
            "disabled": bool(payload.disabled),
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"success": True}


@api_router.get("/dashboard/uc-bookings/list")
async def uc_admin_list_bookings(email: str = Query(...), password: str = Query(...),
                                  from_date: Optional[str] = Query(None, alias="from"),
                                  to_date: Optional[str] = Query(None, alias="to"),
                                  status: Optional[str] = None,
                                  limit: int = 200):
    verify_auth(email, password)
    q: dict = {}
    if status:
        q["status"] = status
    if from_date or to_date:
        date_q: dict = {}
        if from_date:
            date_q["$gte"] = from_date
        if to_date:
            date_q["$lte"] = to_date
        q["slot_date"] = date_q
    cur = (db.uc_bookings.find(q, {"_id": 0})
           .sort([("slot_date", 1), ("slot_time", 1)])
           .limit(min(500, max(1, limit))))
    items = []
    for b in await cur.to_list(length=500):
        if isinstance(b.get("slot_dt_utc"), datetime):
            b["slot_dt_utc"] = b["slot_dt_utc"].isoformat()
        if isinstance(b.get("created_at"), datetime):
            b["created_at"] = b["created_at"].isoformat()
        if isinstance(b.get("cancelled_at"), datetime):
            b["cancelled_at"] = b["cancelled_at"].isoformat()
        items.append(b)
    return {"items": items, "count": len(items)}


@api_router.post("/dashboard/uc-bookings/cancel/{booking_id}")
async def uc_admin_cancel(booking_id: str,
                           email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    res = await db.uc_bookings.update_one(
        {"booking_id": booking_id, "status": "confirmed"},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="booking not found / already cancelled")
    return {"success": True}


# ==================== AUTO WHATSAPP ROUTING (IVR / WEBSITE / CAMPAIGN SHEET) ====================

DEFAULT_WA_ROUTES = {
    "ivr": "visaxpert_ivr",
    "website": "visaxpert_website",
    "jammu": "visaxpert_interested_jammu",
    "pathankot": "visaxpert_interested_pathankot",
    "ludhiana": "visaxpert_interested_ludhiana",
    "amritsar": "visaxpert_interested_amritsar",
    "online": "visaxpert_online_counselling",
    "online_jammu": "online_jammu",
    "online_pathankot": "online_pathankot",
    "online_amritsar": "online_amritsar",
    "online_ludhiana": "online_ludhiana",
    "berlin": "vx_counselling_final",
}
BRANCH_ROUTE_KEYS = ("jammu", "pathankot", "ludhiana", "amritsar", "online")
ONLINE_BRANCH_KEYS = ("jammu", "pathankot", "ludhiana", "amritsar")
WEBSITE_WA_EXCLUDED_SOURCES = {
    "university_change", "germany_fair", "ielts_celebration", "media_design_webinar", "ivr_missed_call",
}
CAMPAIGN_COLUMN_COUNT = 8
DEFAULT_CAMPAIGN_HEADINGS = ["Date", "Name", "Phone", "Email", "City", "Preferred Branch", "Country", "Campaign"]
BERLIN_CAMPAIGN_HEADINGS = ["Date", "Name", "Phone", "Email", "City", "Country", "Campaign", "Form"]


def _phone_country(phone: str) -> str:
    try:
        parsed = phonenumbers.parse(phone, None)
    except phonenumbers.NumberParseException:
        return ""
    name = geocoder.country_name_for_number(parsed, "en")
    if not name:
        region = phonenumbers.region_code_for_country_code(parsed.country_code)
        name = geocoder._region_display_name(region, "en") if region and region != "ZZ" else ""
    return name


def _berlin_layout(items: list) -> list:
    """Old 8-column layout (with Preferred Branch) -> Berlin layout (no branch, adds Form)."""
    return items[:5] + [items[6], items[7], ""]


async def _get_wa_routes() -> dict:
    doc = await db.settings.find_one({"type": "lead_wa_routes"}) or {}
    return {
        "templates": {**DEFAULT_WA_ROUTES, **(doc.get("templates") or {})},
        "send_name_param": doc.get("send_name_param", True),
        "key_hint": {"india": f"…{AISENSY_API_KEY[-6:]}", "berlin": f"…{AISENSY_API_KEY_UC[-6:]}"},
    }


def _branch_route_key(branch: str, online_branch: str = "") -> Optional[str]:
    b = (branch or "").strip().lower()
    if "online" in b:
        combined = f"{b} {(online_branch or '').strip().lower()}"
        for key in ONLINE_BRANCH_KEYS:
            if key in combined:
                return f"online_{key}"
        return "online"
    for key in BRANCH_ROUTE_KEYS:
        if key in b:
            return key
    return None


# Country calling codes Berlin WhatsApp is allowed to send to (list supplied by VisaXpert).
BERLIN_ALLOWED_CALLING_CODES = {1, 7, 20, 27, 30, 31, 32, 33, 34, 36, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66, 81, 82, 84, 86, 90, 91, 92, 93, 94, 95, 98, 211, 212, 213, 216, 218, 220, 221, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 240, 241, 242, 244, 245, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 260, 261, 263, 264, 265, 266, 267, 268, 269, 291, 351, 352, 353, 354, 355, 356, 357, 358, 359, 370, 371, 372, 374, 375, 376, 377, 380, 381, 382, 385, 386, 387, 389, 420, 421, 423, 501, 502, 503, 504, 505, 506, 507, 509, 591, 592, 593, 595, 597, 598, 673, 675, 676, 678, 679, 680, 850, 852, 853, 855, 856, 880, 886, 960, 961, 962, 963, 964, 965, 966, 967, 968, 971, 972, 973, 974, 975, 976, 977, 992, 993, 994, 995, 996, 998}


def _berlin_phone_problem(phone: str) -> str:
    """Return a reason the Berlin number can't be messaged, or '' if it is fine."""
    try:
        parsed = phonenumbers.parse("+" + _format_phone(phone, "49"), None)
    except phonenumbers.NumberParseException:
        return "Not a valid phone number"
    if parsed.country_code not in BERLIN_ALLOWED_CALLING_CODES:
        return f"Country code +{parsed.country_code} is not in the supported country list"
    if not phonenumbers.is_possible_number(parsed):
        return f"+{parsed.country_code} number has the wrong length"
    return ""


async def send_routed_whatsapp(route_key: Optional[str], phone: str, name: str = "",
                               collection: str = "leads", id_field: str = "lead_id",
                               doc_id: Optional[str] = None) -> dict:
    routes = await _get_wa_routes()
    template = routes["templates"].get(route_key or "", "")
    if not phone:
        result = {"ok": False, "error": "No phone number"}
    elif not template:
        result = {"ok": False, "error": "No template for this branch"}
    elif route_key == "berlin" and _berlin_phone_problem(phone):
        result = {"ok": False, "error": _berlin_phone_problem(phone)}
    else:
        is_berlin = route_key == "berlin"
        params = [name or "there"] if (routes["send_name_param"] or is_berlin) else []
        result = await _send_whatsapp_api(
            to_phone=phone, template_name=template, language_code="en",
            body_params=params, header_param=None, recipient_name=name or "",
            api_key_override=AISENSY_API_KEY_UC if is_berlin else None,
        )
    status = "sent" if result.get("ok") else "failed"
    sent_to = "+" + _format_phone(phone, "49" if route_key == "berlin" else "91") if phone else ""
    error = "" if result.get("ok") else str(result.get("error", ""))[:300]
    if "Invalid Number" in error:
        error = f"WhatsApp rejected {sent_to}: the number is not on WhatsApp or is not a real number"
    if doc_id:
        await db[collection].update_one({id_field: doc_id}, {"$set": {"whatsapp": {
            "template": template, "status": status, "sent_to": sent_to,
            "error": error,
            "at": datetime.now(timezone.utc).isoformat(),
        }}})
    log = logger.info if result.get("ok") else logger.error
    log(f"Routed WhatsApp [{route_key}] '{template}' to {sent_to}: {status} {error[:200]}")
    return {**result, "error": error} if error else result


async def send_ivr_routed_whatsapp(phone: str, lead_id: str):
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent = await db.leads.find_one({
        "source": "ivr_missed_call", "phone": phone, "lead_id": {"$ne": lead_id},
        "whatsapp.status": "sent", "created_at": {"$gte": since},
    })
    if recent:
        logger.info(f"IVR WhatsApp skipped for {phone}: already sent in last 24h")
        return
    await send_routed_whatsapp("ivr", phone, "", doc_id=lead_id)


def _require_india_access(email: str, password: str) -> dict:
    return verify_auth(email, password)


def _account_of(user: dict) -> str:
    return "berlin" if user["access"] == "university_change" else "india"


def _sheet_type(account: str) -> str:
    return "campaign_sheet_berlin" if account == "berlin" else "campaign_sheet"


def _account_query(account: str) -> dict:
    return {"account": "berlin"} if account == "berlin" else {"account": {"$ne": "berlin"}}


class WaRoutesIn(BaseModel):
    templates: dict = Field(default_factory=dict)
    send_name_param: bool = True


@api_router.get("/dashboard/wa-routes")
async def get_wa_routes(email: str = Query(...), password: str = Query(...)):
    _require_india_access(email, password)
    return await _get_wa_routes()


@api_router.post("/dashboard/wa-routes")
async def save_wa_routes(payload: WaRoutesIn, email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    current = (await _get_wa_routes())["templates"]
    allowed = ["berlin"] if _account_of(user) == "berlin" else [k for k in DEFAULT_WA_ROUTES if k != "berlin"]
    templates = {k: ((payload.templates.get(k) or "").strip() if k in allowed else current.get(k, "")) for k in DEFAULT_WA_ROUTES}
    await db.settings.update_one(
        {"type": "lead_wa_routes"},
        {"$set": {"type": "lead_wa_routes", "templates": templates, "send_name_param": payload.send_name_param}},
        upsert=True,
    )
    return await _get_wa_routes()


class CampaignColumn(BaseModel):
    heading: str = ""
    sheet_column: str = ""


class CampaignSheetIn(BaseModel):
    spreadsheet_url: str
    gid: str
    tab_name: str = ""
    label: str = ""
    spreadsheet_title: str = ""
    columns: List[CampaignColumn]
    phone_col: int = 2
    name_col: int = 1
    branch_col: int = 5
    online_branch_col: int = -1
    online_branch_column: str = ""
    online_branch_fixed: str = ""
    auto_sync_enabled: bool = False
    sync_interval_minutes: int = 15


class CampaignSyncIn(BaseModel):
    send_to_existing: bool = False


def _spreadsheet_id(url: str) -> str:
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", url or "")
    if not m:
        raise HTTPException(status_code=400, detail="Paste a valid Google Sheets link")
    return m.group(1)


def _tab_csv_url(doc: dict) -> str:
    return f"https://docs.google.com/spreadsheets/d/{_spreadsheet_id(doc['spreadsheet_url'])}/edit#gid={doc['gid']}"


async def fetch_sheet_tabs(sheet_url: str) -> dict:
    sid = _spreadsheet_id(sheet_url)
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            r = await client.get(f"https://docs.google.com/spreadsheets/d/{sid}/htmlview", timeout=30.0)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach Google Sheets: {e}")
    found = re.findall(r'items\.push\(\{name: "((?:[^"\\]|\\.)*)", pageUrl: "[^"]*", gid: "(-?\d+)"', r.text)
    if r.status_code != 200 or not found:
        raise HTTPException(status_code=400, detail='Could not read the tabs. Share the sheet as "Anyone with the link can view".')
    tabs = []
    for name, gid in found:
        try:
            name = json.loads('"' + name.replace("\\x", "\\u00") + '"')
        except Exception:
            pass
        tabs.append({"name": name, "gid": gid})
    title = re.search(r"<title>(.*?)</title>", r.text, re.S)
    title = html.unescape(title.group(1)).rsplit(" - Google ", 1)[0].strip() if title else ""
    return {"tabs": tabs, "title": title}


def _campaign_sheet_out(doc: dict) -> dict:
    return {
        "campaign_sheet_id": doc["campaign_sheet_id"],
        "label": doc.get("label") or doc.get("tab_name") or "Sheet",
        "tab_name": doc.get("tab_name", ""),
        "spreadsheet_title": doc.get("spreadsheet_title", ""),
        "spreadsheet_url": doc.get("spreadsheet_url", ""),
        "gid": doc.get("gid", "0"),
        "columns": doc.get("columns") or [{"heading": h, "sheet_column": ""} for h in DEFAULT_CAMPAIGN_HEADINGS],
        "phone_col": doc.get("phone_col", 2),
        "name_col": doc.get("name_col", 1),
        "branch_col": doc.get("branch_col", 5),
        "online_branch_col": doc.get("online_branch_col", -1),
        "online_branch_column": doc.get("online_branch_column", ""),
        "online_branch_fixed": doc.get("online_branch_fixed", ""),
        "auto_sync_enabled": doc.get("auto_sync_enabled", False),
        "sync_interval_minutes": doc.get("sync_interval_minutes", 15),
        "last_sync": doc.get("last_sync"),
        "last_sync_result": doc.get("last_sync_result"),
    }


def _validate_sheet_payload(p: CampaignSheetIn):
    if len(p.columns) != CAMPAIGN_COLUMN_COUNT:
        raise HTTPException(status_code=422, detail=f"Exactly {CAMPAIGN_COLUMN_COUNT} columns are required")
    for idx in (p.phone_col, p.name_col, p.branch_col):
        if not 0 <= idx < CAMPAIGN_COLUMN_COUNT:
            raise HTTPException(status_code=422, detail="Invalid column index")
    if not -1 <= p.online_branch_col < CAMPAIGN_COLUMN_COUNT:
        raise HTTPException(status_code=422, detail="Invalid column index")
    _spreadsheet_id(p.spreadsheet_url)


def _sheet_fields(p: CampaignSheetIn) -> dict:
    return {
        "spreadsheet_url": p.spreadsheet_url.strip(),
        "gid": p.gid.strip(),
        "tab_name": p.tab_name.strip(),
        "spreadsheet_title": p.spreadsheet_title.strip(),
        "label": (p.label or p.tab_name).strip(),
        "columns": [c.model_dump() for c in p.columns],
        "phone_col": p.phone_col,
        "name_col": p.name_col,
        "branch_col": p.branch_col,
        "online_branch_col": p.online_branch_col,
        "online_branch_column": p.online_branch_column.strip(),
        "online_branch_fixed": p.online_branch_fixed.strip().lower() if p.online_branch_fixed.strip().lower() in ONLINE_BRANCH_KEYS else "",
        "auto_sync_enabled": p.auto_sync_enabled,
        "sync_interval_minutes": max(5, p.sync_interval_minutes),
    }


async def _migrate_berlin_layout():
    async for sh in db.campaign_sheets.find({"account": "berlin"}, {"_id": 0}):
        cols = sh.get("columns") or []
        if [c.get("heading") for c in cols] != DEFAULT_CAMPAIGN_HEADINGS:
            continue
        new_cols = _berlin_layout(cols)
        new_cols[7] = {"heading": "Form", "sheet_column": ""}
        await db.campaign_sheets.update_one({"campaign_sheet_id": sh["campaign_sheet_id"]},
                                            {"$set": {"columns": new_cols, "branch_col": 5, "online_branch_col": -1}})
        async for ld in db.campaign_leads.find({"campaign_sheet_id": sh["campaign_sheet_id"]}, {"_id": 0}):
            vals = list(ld.get("values") or []) + [""] * 8
            vals = _berlin_layout(vals[:8])
            vals[5] = _phone_country(ld.get("phone") or "") or vals[5]
            await db.campaign_leads.update_one({"campaign_lead_id": ld["campaign_lead_id"]},
                                               {"$set": {"values": vals, "branch": ""}})
        logger.info(f"Berlin sheet '{sh.get('label')}' moved to the Berlin column layout")


async def _migrate_legacy_campaign_sheets():
    for account in ("india", "berlin"):
        old = await db.settings.find_one({"type": _sheet_type(account)})
        if not old or not old.get("sheet_url") or await db.campaign_sheets.find_one({"account": account}):
            continue
        gid = re.search(r"[#&?]gid=(\d+)", old["sheet_url"])
        doc = {k: old.get(k) for k in ("columns", "phone_col", "name_col", "branch_col", "online_branch_col",
                                        "auto_sync_enabled", "sync_interval_minutes", "last_sync", "last_sync_result") if k in old}
        doc.update({"campaign_sheet_id": str(uuid.uuid4()), "account": account, "spreadsheet_url": old["sheet_url"],
                    "gid": gid.group(1) if gid else "0", "tab_name": "", "label": "Sheet 1",
                    "created_at": datetime.now(timezone.utc)})
        await db.campaign_sheets.insert_one(doc)
        await db.campaign_leads.update_many(
            {"campaign_sheet_id": {"$exists": False}, **_account_query(account)},
            {"$set": {"campaign_sheet_id": doc["campaign_sheet_id"]}},
        )
        logger.info(f"Migrated legacy campaign sheet for {account}")


async def _get_sheet_or_404(sheet_id: str, account: str) -> dict:
    doc = await db.campaign_sheets.find_one({"campaign_sheet_id": sheet_id, "account": account}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Sheet not found")
    return doc


@api_router.get("/dashboard/campaign-sheet/tabs")
async def list_sheet_tabs(sheet_url: str = Query(...), email: str = Query(...), password: str = Query(...)):
    _require_india_access(email, password)
    return await fetch_sheet_tabs(sheet_url)


@api_router.get("/dashboard/campaign-sheets")
async def list_campaign_sheets(email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    docs = await db.campaign_sheets.find({"account": _account_of(user)}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return {"sheets": [_campaign_sheet_out(d) for d in docs]}


@api_router.post("/dashboard/campaign-sheets")
async def create_campaign_sheet(payload: CampaignSheetIn, email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    _validate_sheet_payload(payload)
    account = _account_of(user)
    sid = _spreadsheet_id(payload.spreadsheet_url)
    if await db.campaign_sheets.find_one({"account": account, "gid": payload.gid.strip(),
                                          "spreadsheet_url": {"$regex": re.escape(sid)}}):
        raise HTTPException(status_code=409, detail="This tab is already connected")
    doc = {"campaign_sheet_id": str(uuid.uuid4()), "account": account,
           "created_at": datetime.now(timezone.utc), **_sheet_fields(payload)}
    await db.campaign_sheets.insert_one(doc)
    return _campaign_sheet_out(doc)


@api_router.put("/dashboard/campaign-sheets/{sheet_id}")
async def update_campaign_sheet(sheet_id: str, payload: CampaignSheetIn,
                                email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    _validate_sheet_payload(payload)
    account = _account_of(user)
    fields = _sheet_fields(payload)
    current = await _get_sheet_or_404(sheet_id, account)
    if current.get("gid") != fields["gid"] or _spreadsheet_id(current.get("spreadsheet_url", "")) != _spreadsheet_id(fields["spreadsheet_url"]):
        fields.update({"last_sync": None, "last_sync_result": None})
        await db.campaign_leads.delete_many({"campaign_sheet_id": sheet_id})
    await db.campaign_sheets.update_one({"campaign_sheet_id": sheet_id}, {"$set": fields})
    await db.campaign_leads.update_many({"campaign_sheet_id": sheet_id}, {"$set": {"sheet_label": fields["label"] or "Sheet"}})
    return _campaign_sheet_out(await _get_sheet_or_404(sheet_id, account))


@api_router.delete("/dashboard/campaign-sheets/{sheet_id}")
async def delete_campaign_sheet(sheet_id: str, email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    await _get_sheet_or_404(sheet_id, _account_of(user))
    await db.campaign_sheets.delete_one({"campaign_sheet_id": sheet_id})
    res = await db.campaign_leads.delete_many({"campaign_sheet_id": sheet_id})
    return {"success": True, "leads_deleted": res.deleted_count}


def _possible_number(digits: str) -> bool:
    try:
        return phonenumbers.is_possible_number(phonenumbers.parse("+" + digits, None))
    except phonenumbers.NumberParseException:
        return False


_HEADING_SYNONYMS = {
    "date": ["date", "createdtime", "timestamp", "submittedat", "createdat"],
    "name": ["fullname", "name", "studentname"],
    "phone": ["phonenumber", "phone", "mobile", "mobilenumber", "contactnumber", "whatsappnumber"],
    "email": ["email", "emailaddress"],
    "campaign": ["campaignname", "campaign"],
}


def _guess_sheet_column(heading: str, headers: List[str], exact: bool = False) -> str:
    norm = lambda v: re.sub(r"[^a-z0-9]", "", (v or "").lower())
    key = norm(heading)
    for syn in _HEADING_SYNONYMS.get(key, [key]):
        for h in headers:
            if h and norm(h) == syn:
                return h
    return "" if exact else next((h for h in headers if h and key and key in norm(h)), "")


def _clean_phone(raw: str, account: str = "india") -> str:
    intl = re.match(r"^\D*(\+|00)", (raw or "").strip()) is not None
    if account == "berlin":
        bare = re.sub(r"\D", "", raw or "")
        if not intl and not (bare.startswith(("0", "49")) or (bare.startswith("1") and len(bare) in (10, 11))):
            return ""
        digits = _format_phone(raw or "", "49")
        if intl and not _possible_number(digits):
            return ""
        return f"+{digits}" if digits else ""
    if intl:
        digits = _format_phone(raw or "")
        if not digits.startswith("91"):
            return f"+{digits}"
    phone = re.sub(r"[^\d]", "", raw or "")
    if phone.startswith("91") and len(phone) == 12:
        phone = phone[2:]
    if phone.startswith("0") and len(phone) == 11:
        phone = phone[1:]
    return phone


async def _do_campaign_sheet_sync(sheet: dict, send_to_existing: bool = False) -> dict:
    account = sheet["account"]
    first_sync = not sheet.get("last_sync")
    send_messages = send_to_existing or not first_sync

    csv_text = await fetch_google_sheet_csv(_tab_csv_url(sheet))
    import csv as _csv
    from io import StringIO
    reader = _csv.DictReader(StringIO(csv_text))
    lookup = {(h or "").strip().lower(): h for h in (reader.fieldnames or []) if h}
    columns = [{**c, "sheet_column": c.get("sheet_column") if (not c.get("sheet_column") or c["sheet_column"].strip().lower() in lookup)
                else _guess_sheet_column(c.get("heading", ""), reader.fieldnames or [])} for c in sheet["columns"]]
    wanted = (sheet.get("online_branch_column") or "").strip()
    online_header = lookup.get(wanted.lower()) or (
        next((h for h in (reader.fieldnames or []) if h and "online" in h.lower() and "branch" in h.lower()), "")
        if wanted else "")
    if account == "berlin":
        columns = [{**c, "sheet_column": _guess_sheet_column(c.get("heading", ""), reader.fieldnames or [], exact=True)}
                   if not c.get("sheet_column") and i not in (sheet.get("name_col", 1), sheet.get("phone_col", 2)) else c
                   for i, c in enumerate(columns)]
    label = sheet.get("label") or sheet.get("tab_name") or "Sheet"

    imported = skipped = queued = 0
    for row in reader:
        values = []
        for col in columns:
            real = lookup.get((col.get("sheet_column") or "").strip().lower())
            values.append(str(row.get(real) or "").strip() if real else "")
        if not any(values):
            skipped += 1
            continue
        raw_phone = values[sheet.get("phone_col", 2)]
        phone = _clean_phone(raw_phone, account)
        bad_phone = bool(re.sub(r"\D", "", raw_phone)) and not phone
        phone_problem = "Phone number has no country code" if bad_phone else (
            _berlin_phone_problem(phone) if account == "berlin" and phone else "")
        bad_phone = bool(phone_problem)
        dedupe_key = phone or hashlib.sha256("|".join(values).encode()).hexdigest()
        if await db.campaign_leads.find_one({"dedupe_key": dedupe_key, "campaign_sheet_id": sheet["campaign_sheet_id"]}):
            skipped += 1
            continue
        seen_elsewhere = bool(phone) and await db.campaign_leads.find_one(
            {"dedupe_key": dedupe_key, **_account_query(account)}) is not None
        if account == "berlin" and phone:
            for i, col in enumerate(columns):
                if (col.get("heading") or "").strip().lower() == "country":
                    values[i] = _phone_country(phone) or values[i]
        name = values[sheet.get("name_col", 1)]
        branch = "" if account == "berlin" else values[sheet.get("branch_col", 5)]
        ob_col = sheet.get("online_branch_col", -1)
        online_branch = values[ob_col] if 0 <= ob_col < len(values) else ""
        if online_header:
            online_branch = str(row.get(online_header) or "").strip()
        if not online_branch and sheet.get("online_branch_fixed") and "online" in branch.lower():
            online_branch = sheet["online_branch_fixed"]
        route_key = "berlin" if account == "berlin" else _branch_route_key(branch, online_branch)
        doc_id = str(uuid.uuid4())
        await db.campaign_leads.insert_one({
            "campaign_lead_id": doc_id,
            "account": account,
            "campaign_sheet_id": sheet["campaign_sheet_id"],
            "sheet_label": label,
            "values": values,
            "phone": phone,
            "name": name,
            "branch": branch,
            "online_branch": online_branch,
            "route_key": route_key,
            "dedupe_key": dedupe_key,
            "status": "new",
            "whatsapp": {
                "template": "", "status": "invalid", "error": phone_problem,
                "at": datetime.now(timezone.utc).isoformat(),
            } if bad_phone else None if (send_messages and not seen_elsewhere) else {
                "template": "", "status": "skipped" if not seen_elsewhere else "duplicate",
                "error": "Existing row at first connect" if not seen_elsewhere else "Already in another connected sheet",
                "at": datetime.now(timezone.utc).isoformat(),
            },
            "created_at": datetime.now(timezone.utc),
        })
        imported += 1
        if send_messages and phone and not seen_elsewhere and not bad_phone:
            queued += 1
            asyncio.create_task(send_routed_whatsapp(
                route_key, phone, name, collection="campaign_leads",
                id_field="campaign_lead_id", doc_id=doc_id,
            ))

    msg = f"Imported {imported}, skipped {skipped}, WhatsApp queued {queued}"
    await db.campaign_sheets.update_one(
        {"campaign_sheet_id": sheet["campaign_sheet_id"]},
        {"$set": {"last_sync": datetime.now(timezone.utc).isoformat(), "last_sync_result": msg}},
    )
    logger.info(f"Campaign sheet sync [{account}/{label}]: {msg}")
    return {"success": True, "imported": imported, "skipped": skipped, "whatsapp_queued": queued, "message": f"{label}: {msg}"}


@api_router.post("/dashboard/campaign-sheets/sync-all")
async def sync_all_campaign_sheets(email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    sheets = await db.campaign_sheets.find({"account": _account_of(user)}, {"_id": 0}).to_list(100)
    if not sheets:
        raise HTTPException(status_code=400, detail="Connect a Google Sheet first")
    results = []
    for sh in sheets:
        try:
            results.append((await _do_campaign_sheet_sync(sh))["message"])
        except HTTPException as e:
            results.append(f"{sh.get('label')}: {e.detail}")
    return {"success": True, "message": " | ".join(results)}


@api_router.post("/dashboard/campaign-sheets/{sheet_id}/sync")
async def sync_campaign_sheet(sheet_id: str, payload: CampaignSyncIn,
                              email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    sheet = await _get_sheet_or_404(sheet_id, _account_of(user))
    return await _do_campaign_sheet_sync(sheet, payload.send_to_existing)


async def _maybe_run_campaign_sheet_sync():
    if db is None:
        return
    async for s in db.campaign_sheets.find({"auto_sync_enabled": True, "last_sync": {"$ne": None}}, {"_id": 0}):
        last = datetime.fromisoformat(s["last_sync"])
        if (datetime.now(timezone.utc) - last).total_seconds() < int(s.get("sync_interval_minutes", 15)) * 60:
            continue
        try:
            await _do_campaign_sheet_sync(s)
        except Exception as e:
            logger.error(f"Auto campaign sync failed for {s.get('label')}: {e}")


@api_router.get("/dashboard/campaign-leads")
async def list_campaign_leads(
    email: str = Query(...), password: str = Query(...),
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=200),
    search: str = Query(""), branch: str = Query(""), sheet_id: str = Query(""),
):
    user = _require_india_access(email, password)
    account = _account_of(user)
    query: dict = _account_query(account)
    if sheet_id:
        query["campaign_sheet_id"] = sheet_id
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [{"values": rx}, {"phone": rx}]
    if branch:
        query["route_key"] = None if branch == "none" else ({"$regex": "^online"} if branch == "online" else branch)
    total = await db.campaign_leads.count_documents(query)
    cursor = db.campaign_leads.find(query, {"_id": 0, "dedupe_key": 0}).sort("created_at", -1) \
        .skip((page - 1) * per_page).limit(per_page)
    phone_cols = {s["campaign_sheet_id"]: s.get("phone_col", 2) async for s in db.campaign_sheets.find(
        {"account": account}, {"_id": 0, "campaign_sheet_id": 1, "phone_col": 1})}
    items = []
    async for d in cursor:
        d["created_at"] = d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at")
        d["phone_col"] = phone_cols.get(d.get("campaign_sheet_id"), 2)
        items.append(d)
    sheet = await db.campaign_sheets.find_one(
        {"account": account, **({"campaign_sheet_id": sheet_id} if sheet_id else {})}, {"_id": 0}, sort=[("created_at", 1)])
    settings = _campaign_sheet_out(sheet) if sheet else {"columns": [{"heading": h} for h in (
        BERLIN_CAMPAIGN_HEADINGS if account == "berlin" else DEFAULT_CAMPAIGN_HEADINGS)]}
    skipped_count = await db.campaign_leads.count_documents(
        {"whatsapp.status": "skipped", "phone": {"$nin": ["", None]}, **_account_query(account)})
    failed_count = await db.campaign_leads.count_documents(
        {"whatsapp.status": "failed", "phone": {"$nin": ["", None]}, **_account_query(account)})
    return {
        "account": account,
        "skipped_count": skipped_count,
        "failed_count": failed_count,
        "headings": [c.get("heading") or f"Column {i + 1}" for i, c in enumerate(settings["columns"])],
        "phone_col": settings.get("phone_col", 2),
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@api_router.post("/dashboard/campaign-leads/send-skipped")
async def send_skipped_campaign_leads(email: str = Query(...), password: str = Query(...),
                                      status: str = Query("skipped", pattern="^(skipped|failed)$")):
    user = _require_india_access(email, password)
    account = _account_of(user)
    docs = await db.campaign_leads.find(
        {"whatsapp.status": status, "phone": {"$nin": ["", None]}, **_account_query(account)},
        {"_id": 0, "campaign_lead_id": 1, "phone": 1, "name": 1, "branch": 1, "online_branch": 1},
    ).to_list(5000)
    ids = [d["campaign_lead_id"] for d in docs]
    await db.campaign_leads.update_many(
        {"campaign_lead_id": {"$in": ids}},
        {"$set": {"whatsapp": {"template": "", "status": "queued", "error": "", "at": datetime.now(timezone.utc).isoformat()}}},
    )

    async def _run():
        for d in docs:
            route = "berlin" if account == "berlin" else _branch_route_key(d.get("branch", ""), d.get("online_branch", ""))
            try:
                await send_routed_whatsapp(route, d["phone"], d.get("name", ""), collection="campaign_leads",
                                           id_field="campaign_lead_id", doc_id=d["campaign_lead_id"])
            except Exception as e:
                logger.error(f"send-skipped failed for {d['campaign_lead_id']}: {e}")
            await asyncio.sleep(0.5)

    asyncio.create_task(_run())
    return {"success": True, "queued": len(docs)}


@api_router.post("/dashboard/campaign-leads/{lead_id}/resend")
async def resend_campaign_whatsapp(lead_id: str, email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    account = _account_of(user)
    doc = await db.campaign_leads.find_one({"campaign_lead_id": lead_id, **_account_query(account)})
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    result = await send_routed_whatsapp(
        "berlin" if account == "berlin" else _branch_route_key(doc.get("branch", ""), doc.get("online_branch", "")),
        doc.get("phone", ""), doc.get("name", ""),
        collection="campaign_leads", id_field="campaign_lead_id", doc_id=lead_id,
    )
    return {"success": bool(result.get("ok")), "error": result.get("error", "")}


@api_router.delete("/dashboard/campaign-leads/{lead_id}")
async def delete_campaign_lead(lead_id: str, email: str = Query(...), password: str = Query(...)):
    user = _require_india_access(email, password)
    res = await db.campaign_leads.delete_one({"campaign_lead_id": lead_id, **_account_query(_account_of(user))})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}


# ==================== TEAM & STUDENT TESTIMONIALS ====================

PROFILE_COLLECTIONS = {
    "team": {"collection": "team_members", "text_fields": ["name", "designation"]},
    "testimonials": {"collection": "student_testimonials", "text_fields": ["name", "country", "review"]},
}


def _profile_out(d: dict) -> dict:
    if isinstance(d.get("created_at"), datetime):
        d["created_at"] = d["created_at"].isoformat()
    return d


def _profile_cfg(kind: str) -> dict:
    cfg = PROFILE_COLLECTIONS.get(kind)
    if not cfg:
        raise HTTPException(status_code=404, detail="Not found")
    return cfg


@api_router.get("/profiles/{kind}")
async def public_list_profiles(kind: str):
    cfg = _profile_cfg(kind)
    items = await db[cfg["collection"]].find({"is_active": True}, {"_id": 0}).sort([("order", 1), ("created_at", -1)]).to_list(500)
    return {"items": [_profile_out(i) for i in items]}


@api_router.get("/profiles/{kind}/{profile_id}")
async def public_get_profile(kind: str, profile_id: str):
    cfg = _profile_cfg(kind)
    doc = await db[cfg["collection"]].find_one({"profile_id": profile_id, "is_active": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return _profile_out(doc)


@api_router.get("/dashboard/profiles/{kind}")
async def admin_list_profiles(kind: str, email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    cfg = _profile_cfg(kind)
    items = await db[cfg["collection"]].find({}, {"_id": 0}).sort([("order", 1), ("created_at", -1)]).to_list(1000)
    return {"items": [_profile_out(i) for i in items]}


@api_router.post("/dashboard/profiles/{kind}")
async def admin_create_profile(
    kind: str,
    file: UploadFile = File(...),
    name: str = Form(...),
    designation: str = Form(""),
    country: str = Form(""),
    review: str = Form(""),
    order: int = Form(0),
    email: str = Query(...),
    password: str = Query(...),
):
    verify_auth(email, password)
    cfg = _profile_cfg(kind)
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP and GIF allowed")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")
    values = {"name": name.strip(), "designation": designation.strip(), "country": country.strip(), "review": review.strip()}
    missing = [f for f in cfg["text_fields"] if not values[f]]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing: {', '.join(missing)}")
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    image_url = await save_upload(f"{kind}-{uuid.uuid4().hex[:10]}.{ext}", file.content_type, contents)
    doc = {
        "profile_id": str(uuid.uuid4()),
        **{f: values[f] for f in cfg["text_fields"]},
        "image_url": image_url,
        "order": order,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db[cfg["collection"]].insert_one(doc)
    doc.pop("_id", None)
    return _profile_out(doc)


@api_router.patch("/dashboard/profiles/{kind}/{profile_id}/toggle")
async def admin_toggle_profile(kind: str, profile_id: str, email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    cfg = _profile_cfg(kind)
    doc = await db[cfg["collection"]].find_one({"profile_id": profile_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    new_state = not doc.get("is_active", True)
    await db[cfg["collection"]].update_one({"profile_id": profile_id}, {"$set": {"is_active": new_state}})
    return {"success": True, "is_active": new_state}


@api_router.delete("/dashboard/profiles/{kind}/{profile_id}")
async def admin_delete_profile(kind: str, profile_id: str, email: str = Query(...), password: str = Query(...)):
    verify_auth(email, password)
    cfg = _profile_cfg(kind)
    res = await db[cfg["collection"]].delete_one({"profile_id": profile_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"success": True}


# ==================== APP SETUP ====================

app.include_router(api_router)

# Uploaded files are served by GET /api/uploads/{filename} (see serve_upload),
# which reads durable bytes from MongoDB with an on-disk fallback for legacy files.

# Backward compat: serve legacy /assets/uploads/* URLs that were saved before
# the path migration. Checks MongoDB first, then new dir, then legacy dir.
@app.get("/assets/uploads/{filename:path}")
async def legacy_asset_uploads(filename: str):
    from fastapi.responses import Response, FileResponse
    doc = await db.uploaded_files.find_one({"filename": filename})
    if doc and doc.get("data") is not None:
        data = doc["data"]
        if not isinstance(data, (bytes, bytearray)):
            data = bytes(data)
        return Response(content=data, media_type=doc.get("content_type", "application/octet-stream"))
    new_path = UPLOAD_DIR / filename
    if new_path.exists():
        return FileResponse(new_path)
    legacy_path = LEGACY_UPLOAD_DIR / filename
    if legacy_path.exists():
        return FileResponse(legacy_path)
    raise HTTPException(status_code=404, detail="File not found")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await startup_db_client()
    # Index for scheduler performance
    try:
        await db.whatsapp_messages.create_index([("status", 1), ("scheduled_at", 1)])
        await db.whatsapp_templates.create_index("template_id", unique=True)
    except Exception as e:
        logger.warning(f"Index creation skipped: {e}")
    # Indexes for UC booking system
    try:
        await db.uc_bookings.create_index(
            [("slot_date", 1), ("slot_time", 1)],
            unique=True,
            partialFilterExpression={"status": "confirmed"},
            name="uc_unique_confirmed_slot",
        )
        await db.uc_bookings.create_index("booking_id", unique=True)
        await db.uc_slot_overrides.create_index(
            [("date", 1), ("time", 1)], unique=True, name="uc_slot_override_unique"
        )
    except Exception as e:
        logger.warning(f"UC booking index creation skipped: {e}")
    # One-off: copy any existing files from legacy upload dir to new dir so
    # legacy /assets/uploads/xxx URLs continue to work via the fallback route
    try:
        if LEGACY_UPLOAD_DIR.exists():
            for src in LEGACY_UPLOAD_DIR.iterdir():
                if src.is_file():
                    dst = UPLOAD_DIR / src.name
                    if not dst.exists():
                        import shutil
                        shutil.copy2(src, dst)
    except Exception as e:
        logger.warning(f"Legacy upload migration skipped: {e}")
    try:
        await _migrate_legacy_campaign_sheets()
        await _migrate_berlin_layout()
    except Exception as e:
        logger.warning(f"Campaign sheet migration skipped: {e}")
    # Launch background scheduler loop
    asyncio.create_task(_scheduler_loop())


@app.on_event("shutdown")
async def shutdown_event():
    await shutdown_db_client()
