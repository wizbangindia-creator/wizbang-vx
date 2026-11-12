#!/usr/bin/env bash
# Run this on the VPS after every `git pull`. Idempotent.
# Usage: bash backend/deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing Python deps"
pip install -r requirements.txt --quiet

echo "==> Seeding WhatsApp templates (idempotent)"
python seed_main_landing_templates.py
python seed_germany_fair_templates.py

echo "==> Done. Now:"
echo "    1) Make sure backend/.env has AISENSY_API_KEY, WHATSAPP_PROVIDER=aisensy, PUBLIC_BASE_URL"
echo "    2) Restart the backend service:"
echo "         sudo systemctl restart visaxpert-backend"
echo "       (or whichever process manager you use)"
echo "    3) Rebuild the frontend if you also pulled UI changes:"
echo "         cd ../frontend && yarn install && yarn build && sudo systemctl reload nginx"
