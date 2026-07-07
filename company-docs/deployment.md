# Ascendra v1 — Deployment Guide (Epic L)

Status: DO-1/DO-2/DO-3 deliverable. Two stateless deployables per
`architecture.md` Section 2/7 — no database, no Redis, no persistent
volumes, no auth. This doc covers local/full-stack verification and the
concrete steps for a real deploy once cloud accounts and a real
`ANTHROPIC_API_KEY` exist.

## Topology

```
Browser ──HTTP──> Frontend (Next.js, SSR/static)
   │                    │
   │  (only network dep)│  build-time NEXT_PUBLIC_AI_PROXY_URL
   ▼                    ▼
Backend (FastAPI, stateless) ──outbound HTTPS──> Anthropic API
```

- Frontend: all game state lives in the browser (`localStorage`). The only
  network call is `POST /v1/events/generate`, wrapped in a hard 5s
  client-side timeout with a full local fallback (architecture.md Section 5).
- Backend: one real secret (`ANTHROPIC_API_KEY`), no DB, horizontally trivial —
  any number of replicas can run behind a load balancer with zero shared
  state.

## Files in this package

| File | Purpose |
|---|---|
| `backend/Dockerfile` | Backend container image. Pinned to `python:3.13-slim` — **do not bump to 3.14**: `pydantic-core` has no prebuilt wheel for 3.14 yet and fails to build from source. |
| `frontend/Dockerfile` | Multi-stage Next.js production image using `output: "standalone"` (set in `frontend/next.config.ts`) for a minimal runtime image. |
| `frontend/.dockerignore` | Keeps `node_modules`/`.next`/git out of the build context. |
| `docker-compose.yml` (repo root) | Wires both services together for local full-stack runs. |
| `.env.example` (repo root) | Documents every env var needed for the compose stack. |
| `scripts/smoke.sh` | DO-3 smoke test: boots the stack, hits health + generate + frontend root, prints manual fallback-verification steps. |

## Environment variable wiring

| Variable | Consumed by | Points at | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | backend | Anthropic API | The one real secret. Leave unset to run the built-in stub (schema-valid canned response) — safe for local dev/demo, no account needed. |
| `ANTHROPIC_MODEL` | backend | — | Defaults to `claude-haiku-4-5` (fastest/cheapest — fits the 5s event budget). Set `claude-sonnet-5` / `claude-opus-4-8` for richer prose (slower, usually falls back). |
| `ANTHROPIC_TIMEOUT_SECONDS` | backend | — | Server-side call timeout, kept under the frontend's 5s hard abort. |
| `CORS_ALLOW_ORIGINS` | backend | frontend's real origin | **Must be updated at deploy time** to the actual deployed frontend URL (e.g. `https://ascendra.vercel.app`). Comma-separated for multiple origins (e.g. preview + prod). |
| `USE_STUB` | backend | — | Force `true`/`false` to override auto-detection; leave blank for auto (stub only when no key). |
| `RATE_LIMIT_PER_MINUTE` | backend | — | Per-IP rate limit on the billed generate endpoint (default `30`). Security review Finding 1. **In-memory/per-process** — if you run more than one backend instance, this limit is per-instance, so front it with an edge/CDN/load-balancer rate limit for a true global cap. |
| `MAX_REQUEST_BODY_BYTES` | backend | — | Max accepted request body size (default `8192`). Security review Finding 2. |
| `NEXT_PUBLIC_AI_PROXY_URL` | frontend (build-time) | backend's real origin | **Baked into the JS bundle at build time** (Next.js `NEXT_PUBLIC_*` convention) — must be set before `next build` / `docker build`, not just before running the container. Must be the backend's browser-reachable URL, never an internal service name. |

## Local full-stack verification (docker compose)

```bash
cp .env.example .env      # edit if you have a real ANTHROPIC_API_KEY; blank is fine
docker compose up --build
# frontend: http://localhost:3000
# backend:  http://localhost:8000/v1/health
```

Or run the automated smoke test:

```bash
./scripts/smoke.sh
```

This builds and boots both containers (backend forced into stub mode so no
API key is required), checks `/v1/health`, exercises
`POST /v1/events/generate`, confirms the frontend serves, tears the stack
down, and prints the manual steps to verify the fallback guarantee (see
below).

### Verifying the fallback guarantee (the important reliability property)

Per architecture.md Section 7 Key Decision #3, fallback logic lives entirely
client-side so the game keeps working even if the backend is completely
down (deploy hiccup, DNS issue, wrong URL, etc.) — not just if the AI call
itself errors.

```bash
docker compose up -d
docker compose stop backend        # simulate full backend outage
# open http://localhost:3000, create a company, advance weeks
# an Engineering event should still render (fallback template) within 5s,
# and the game should be fully playable to an end state with the backend
# never coming back up.
docker compose start backend       # restore
```

## Real deploy — concrete steps per service

No cloud accounts or a real API key exist in this environment, so nothing
below was actually provisioned. These are the steps to run once you have
them.

### Backend (FastAPI container — any container host)

The service is a plain stateless container; use whatever host you already
operate (a single VM with Docker, a managed container platform, etc.) — no
Phase-2-sized orchestration is needed for one stateless, keyless-by-default
service.

1. Build and push the image: `docker build -t <registry>/ascendra-backend:<tag> ./backend && docker push ...`
2. Deploy the container, exposing port 8000, injecting:
   - `ANTHROPIC_API_KEY` from your host's secrets manager (never hardcode; never commit to `.env` in git — `.env` is git-ignored in this repo already).
   - `CORS_ALLOW_ORIGINS` set to the frontend's real deployed origin.
3. Point a health check at `GET /v1/health` (already wired in `docker-compose.yml`'s healthcheck block — reuse the same command/probe on whatever host you pick).
4. Confirm outbound HTTPS to `api.openai.com` is allowed (no other outbound/inbound needs beyond the exposed port).

**Rollback:** stateless + no data store means rollback is just redeploying
the previous image tag — no migration/data concerns. Keep the previous
image tag available until the new one is confirmed healthy.

### Frontend (Next.js — recommended: Vercel; alternative: the Dockerfile in this package)

**Recommended path (zero-config): Vercel.**
1. Import the `frontend/` directory as a Vercel project (framework auto-detected as Next.js).
2. Set the environment variable `NEXT_PUBLIC_AI_PROXY_URL` to the backend's deployed URL in Vercel's project settings (Production + Preview as needed) — **before** the first deploy/build, since it's baked in at build time.
3. Deploy. Vercel handles SSR/static hybrid output automatically; the `output: "standalone"` config in `next.config.ts` is harmless for Vercel (Vercel ignores it and uses its own build output).

**Alternative (concrete artifact in this package): the Dockerfile.**
1. `docker build --build-arg NEXT_PUBLIC_AI_PROXY_URL=https://<your-backend-host> -t <registry>/ascendra-frontend:<tag> ./frontend`
2. Push and deploy the container (port 3000) to whatever host you use for the backend.
3. **Important:** if the proxy URL changes later, you must rebuild the image (build-time bake), not just change a runtime env var.

**Rollback:** same as backend — stateless container/static build, redeploy previous tag/build.

## Blast radius / cost notes

- Blast radius if the backend deploy fails or is misconfigured: zero impact
  on the core game loop (fallback path covers it) — only the AI-flavor
  narrative degrades to templated text. This is the entire point of the
  client-side fallback design.
- Blast radius if the frontend deploy fails: full outage (it's the only
  user-facing surface) — standard static/SSR rollback (previous
  build/container) applies.
- Cost: one small stateless container/serverless function for the backend
  (no idle DB/Redis cost) + Anthropic usage cost, bounded by design to 4-10
  calls per 20-week playthrough using the `claude-sonnet-5` tier and small
  fixed-size prompts (architecture.md Section 5, "Cheap-by-design measures").
  No infra cost from this deploy package beyond compute for the two
  containers/functions themselves.

## Gates before shipping a real deploy

- All existing test suites green: frontend `npm run test`/`npm run typecheck`, backend `pytest` (owned by Tester/respective engineers, not re-run/modified here).
- QA-1/QA-2 (fixed playthrough + internal playtest) per `eng-tasks.md` Epic K, since this deploy doc doesn't gate game-loop correctness, only infra.
- DO-3 smoke test (`scripts/smoke.sh`) green, plus the manual fallback-with-backend-down check above.
