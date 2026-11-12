# VisaXpert Site – Clone & Run

This sets up the existing VisaXpert study-abroad consultancy app from github.com/wizbangindia-creator/vx and gets it running here.
It includes the marketing pages, lead capture, WhatsApp and email follow-ups, Berlin university-change booking and the admin dashboard, all working the way they do in the repo.

## Who it's for
- Students and parents looking into studying abroad who visit the site, browse it and leave their details.
- VisaXpert staff and admins (admin@visaxpert.com, sunilarora@visaxpert.co, navyaarora@visaxpert.co) who manage leads and campaigns.

## Core features and experience
- Marketing pages: home, branches with real addresses, phone numbers and opening hours, and student testimonials.
- Lead capture forms and a booking popup for consultations.
- Berlin university-change booking flow.
- Automatic WhatsApp messages sent through AiSensy, plus email replies, whenever a lead comes in. These send for real.
- Lead sync to Google Sheet, kept on as the repo has it.
- Admin dashboard to view, filter and manage leads and campaign leads.

## User flow
1. A visitor opens the site, browses pages and fills in a form or the booking popup.
2. The lead is saved, a WhatsApp message and an email go out, and the lead is copied to the Google Sheet.
3. Staff sign in to the admin dashboard to review, filter and follow up on leads.

## UI/UX feel
- Same as the repo. The design, text and layout stay as they are.

## Implementation phases
- **Phase 1 (MVP, built now):** Copy the whole repo here, install what it needs, fix only what stops it from starting, and connect the live AiSensy, email and Google Sheets keys through a secure card. Then check that the site, forms, messages, sheet sync and admin login all work from start to finish.
- **Phase 2:** Any changes or fixes the user asks for once the app is running.
- **Phase 3:** Publish it on a live domain.

## Assumptions
- The app runs exactly as it is in the repo. Nothing is redesigned or added.
- WhatsApp and email go live, using the user's own AiSensy and email keys, which are requested through the secure card.
- Google Sheets sync stays on and needs the user's Google access details. If none are given, leads are still saved in the app and only the sheet sync is skipped.
- Admin and staff logins stay the same as in the repo. Data starts empty unless the repo ships sample content.
- If a key is missing, only that one feature is paused. The rest of the app keeps working.
