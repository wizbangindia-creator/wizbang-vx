# VisaXpert — PRD

## Origin
Cloned from GitHub `wizbangindia-creator/vx`, running in Emergent (FastAPI + React + MongoDB).

## Overview
Study-abroad consultancy site: marketing pages, lead capture, WhatsApp (AiSensy) + email automation, Berlin university-change booking, admin dashboard.

## Users
- sunilarora@visaxpert.co — Indian enquiries admin (main_landing)
- navyaarora@visaxpert.co — University change (Berlin)
- admin@visaxpert.com — all access

## Implemented
- Jun 2026: Clone + run, seeds loaded.
- Jun 2026 (iteration 2):
  - Countries: Singapore removed; Netherlands + Sweden added (9 countries total, sitemap updated).
  - Footer: LinkedIn/YouTube removed, "Founded by Sunil Arora" removed, landing-page links removed (Help column: FAQ/Contact/Privacy/Terms).
  - All public emails -> info@visaxpertinternational.co.in; IELTS/PTE coaching mentions removed from main site (homepage service+FAQ, FAQ page category, branch services).
  - Dashboard "Campaign Leads" tab (non-UC users): connect public Google Sheet (tab gid supported), 8 columns with custom headings + sheet-column mapping, name/phone/branch role columns, manual/auto sync, first-connect option to skip messaging existing rows, dedupe by phone, resend/delete, branch filter, WhatsApp status per row.
  - Instant AiSensy WhatsApp routing (editable in "WhatsApp templates" modal, default {{1}} = name):
    IVR -> visaxpert_ivr (max once per number / 24h); website forms (/enquiry, homepage, contact, country/branch forms) -> visaxpert_website;
    sheet branch Jammu/Pathankot/Ludhiana/Amritsar/Online -> visaxpert_interested_<branch> / visaxpert_online_counselling.
    Meta/Google ad webhooks keep the legacy template; GF/IELTS/UC/webinar flows unchanged.
  - Old Leads-tab sheet sync controls now only visible to admin@visaxpert.com.

## Iteration 3 (Jun 2026)
- Booking popup (name, phone, country 9 + Other w/ text) from hero, navbar, Others country card (home + /countries); 30-min call copy; removed No-cost badge + home branches section; navbar "Our Branches".
- Branch data: real addresses/phones/opening times + Google directions links; maps removed (branch + contact).
- /about page (approach pillars, founders Sunil Arora & Rajesh Joshi, ICEF, team from admin); home approach strip.
- Admin Team + Student Testimonials tabs (photo upload); home sliding testimonials + /student-stories/:id pages.

## Iteration 4 (Jun 2026)
- Berlin: all Berlin landing-page leads (source university_change) + Berlin-login Campaign Leads sheet rows send vx_counselling_final (name only) via Berlin AiSensy account. Campaign Leads tab now per-account (india / berlin).
- AiSensy keys read from env AISENSY_API_KEY / AISENSY_API_KEY_UC (hardcoded fallback). GTM-5QWK2XNH already in index.html.

## Iteration 5 (Jun 2026)
- Campaign sheet: optional "online branch" column; Online rows route to online_jammu / online_pathankot / online_amritsar / online_ludhiana (also detects "Online - Jammu" in Preferred Branch); no branch -> visaxpert_online_counselling. Study Abroad form unchanged (offline keeps visaxpert_website).

## Iteration 6 (Jun 2026)
- AiSensy keys hardcoded (no env override); key_hint shown in WhatsApp templates modal.
- Campaign Leads "Send all skipped (N)" button: POST /api/dashboard/campaign-leads/send-skipped (per account, background, 0.5s spacing).

## Backlog
- P1: Move hardcoded AiSensy keys to env/secrets.
- P1: Dashboard Website stat counts only source=website (homepage source not counted) — pre-existing.
- P2: Campaign leads status column (new/contacted), CSV export.
- P2: IELTS Celebration landing page still mentions mock tests (intentionally untouched).
