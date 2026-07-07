#!/usr/bin/env bash
# Ascendra Epic L / DO-3 smoke test.
#
# Boots the full stack via docker compose (backend in stub mode — no
# OPENAI_API_KEY required) and exercises:
#   1. GET  /v1/health           on the backend
#   2. POST /v1/events/generate  on the backend (stub/no-key path)
#   3. GET  /                    on the frontend (confirms it builds/serves)
#
# It also documents (but does not automate, since it requires manual
# browser interaction) how to verify the client-side fallback guarantee:
# the game must keep working with the backend killed entirely.
#
# Usage: ./scripts/smoke.sh
set -euo pipefail

cd "$(dirname "$0")/.."

BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

echo "==> Building and starting stack (backend USE_STUB=true, no API key needed)..."
USE_STUB=true docker compose up -d --build

cleanup() {
  echo "==> Tearing down stack..."
  docker compose down
}
trap cleanup EXIT

echo "==> Waiting for backend health check..."
for i in $(seq 1 30); do
  if curl -sf "$BACKEND_URL/v1/health" > /dev/null; then
    echo "Backend healthy."
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "FAIL: backend never became healthy" >&2
    exit 1
  fi
done

echo "==> GET /v1/health"
curl -sf "$BACKEND_URL/v1/health" | tee /dev/stderr | grep -q '"status":"ok"' \
  && echo "PASS: health check" || { echo "FAIL: health check"; exit 1; }

echo "==> POST /v1/events/generate (stub path, no key required)"
RESP=$(curl -sf -X POST "$BACKEND_URL/v1/events/generate" \
  -H "Content-Type: application/json" \
  -d '{
        "trigger": "engineering",
        "context": {
          "companyName": "SmokeTestCo",
          "industry": "AI",
          "founderType": "Engineer",
          "week": 3,
          "technicalDebt": 40,
          "cash": 100000,
          "mrr": 4000,
          "customerCount": 50,
          "severityHint": "moderate"
        }
      }')
echo "$RESP"
echo "$RESP" | grep -q '"narrative"' && echo "$RESP" | grep -q '"choices"' \
  && echo "PASS: /v1/events/generate returned a schema-shaped response" \
  || { echo "FAIL: unexpected response shape"; exit 1; }

echo "==> Waiting for frontend to respond..."
for i in $(seq 1 30); do
  if curl -sf "$FRONTEND_URL" > /dev/null; then
    echo "Frontend serving."
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "FAIL: frontend never came up" >&2
    exit 1
  fi
done

echo "==> GET / (frontend)"
curl -sf "$FRONTEND_URL" > /dev/null && echo "PASS: frontend responds on $FRONTEND_URL"

cat <<'EOF'

==============================================================================
MANUAL STEP — fallback reliability guarantee (architecture.md Section 7,
Key Decision #3): the game must keep working with the backend fully down.

  1. docker compose stop backend
  2. Open http://localhost:3000 in a browser, create a company, advance
     weeks until an Engineering event rolls.
  3. Confirm the event still renders (narrative + 2-3 choices) within the
     5s client timeout — this is the client-side fallback template path,
     not a network retry — and the game is fully playable to an end state
     with zero backend involvement.
  4. docker compose start backend   # restore before further smoke testing
==============================================================================

All automated smoke checks passed.
EOF
