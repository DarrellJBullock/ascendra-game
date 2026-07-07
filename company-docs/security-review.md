# Ascendra v1 Security Review — AI Event Proxy & Frontend

**Verdict: SHIP WITH FOLLOWUP** — sound for an internal playtest with the stub/no-key path or a low-traffic, trusted-audience real-key rollout; there is one real (not hypothetical) cost/abuse gap that must be closed before the `OPENAI_API_KEY` goes live behind a public URL.

> **RESOLUTION UPDATE:** Findings **1, 2, and 4 have been fixed** — a per-IP sliding-window rate limiter (`RATE_LIMIT_PER_MINUTE`, default 30) and request body-size cap (`MAX_REQUEST_BODY_BYTES`, default 8 KB) were added in `backend/app/middleware.py` and wired in `main.py`, returning `429 {"error":"rate_limited"}` / `413 {"error":"payload_too_large"}`; CORS `allow_credentials` is now `False`. Verified live (429 and 413 both fire) and by tests (22 backend tests passing). The one remaining caveat: the limiter is in-memory/per-process, so a **multi-instance** deploy still needs an edge/CDN rate limit for a true global cap — noted in `deployment.md`. Findings 3 (alerting) and the info items remain as deferred/nice-to-have.

> **Reviewer scope note (added during consolidation):** the review pass searched `frontend/src` only and concluded the event-card and company-creation UI "did not exist yet." They DO exist under `frontend/components/`. Those two items (original Finding 5 and the XSS-via-narrative open question) have been re-verified directly against the real components and updated below — both come back clean.

## Scope reviewed
- `backend/app/config.py`, `ai_client.py`, `routes.py`, `validation.py`, `models.py`, `main.py`, `stub.py`
- `backend/requirements.txt`, `.env.example`, `.gitignore`
- `frontend/src/game/eventNarrative.ts` (fetch/timeout/client-side validation), `storage.ts` (localStorage), `package.json`
- `frontend/components/event/EventCard.tsx`, `frontend/components/company-creation/` (re-verified during consolidation)
- Assessed against `company-docs/architecture.md` Section 5 (intended hardening) and Section 7 (deliberate no-auth/no-DB v1 scope) — did not flag "no auth/DB" as a defect.

---

## Findings

### 1. [High] Unauthenticated AI proxy = unbounded cost amplification once a real key is live
**Location:** `backend/app/routes.py` (`POST /v1/events/generate`), `backend/app/main.py` (no rate limiting anywhere in the stack).
**Issue:** The endpoint is public, has no auth, and — confirmed in code, not just self-flagged — has no rate limiting of any kind (no per-IP throttle, no global request cap, no payload-count cap). Once `OPENAI_API_KEY` is set, every POST that passes Pydantic validation triggers a real, billed OpenAI call. Nothing stops a script from hitting it in a tight loop.
**Why it matters:** This is the one part of the system that costs real money per request. An anonymous caller (or a bot that finds the URL) can drive unbounded OpenAI spend with a single trivial script — a concrete, not speculative, financial risk the moment the key is live, independent of whether anyone plays the game.
**Fix direction:** Before the real key goes live behind a public/shared URL: add a lightweight edge or in-memory per-IP rate limit (e.g., `slowapi`, or a reverse-proxy/CDN rate limit rule) sized to the game's real usage pattern (4-10 calls per ~20-week session). No DB required — an in-memory token bucket per-process is enough for a stateless single-instance deploy, and is explicitly called out as acceptable in architecture Section 5's follow-up note. **Fine to defer only if v1 stays behind a non-public/internal-only URL for the playtest** (not linked publicly, VPN-gated, or still on `USE_STUB=true`/no key).

### 2. [Medium] No request body size cap enforced independent of field-level limits
**Location:** `backend/app/models.py` (`EventRequestContext`), `main.py` (no `Content-Length`/body-size middleware).
**Issue:** Pydantic enforces `companyName` ≤ 40 chars and typed/bounded numeric fields, but Starlette has no global max-body-size guard configured. A caller can send an oversized JSON body (extra keys, deeply nested garbage, huge string in a field rejected only after full parse) — cheap to do repeatedly.
**Why it matters:** Combined with Finding 1 (no rate limit), this is a second, independent lever for resource exhaustion against the FastAPI process itself (parse cost), not just OpenAI cost.
**Fix direction:** Add a body-size limit at the reverse proxy/ingress level (DevOps) or via Starlette middleware; low effort, pairs naturally with Finding 1.

### 3. [Low] `invalid_response` events are logged but nothing alerts on them
**Location:** `backend/app/routes.py` (`logger.warning("AI response failed validation...")`).
**Issue:** Validation failures are logged via standard Python logging, but there's no alerting/threshold check. A sustained run of `invalid_response` from one source could indicate a prompt-injection probe and would currently go unnoticed unless someone is tailing logs.
**Why it matters:** The self-flagged item from the backend agent — confirmed accurate. Not urgent for a small known internal audience; worth having before wider exposure.
**Fix direction:** Simple counter/alert (e.g. a log-based metric alarm on `invalid_response` rate). No new infra required.

### 4. [Info] CORS config is correctly scoped for v1, but should be double-checked at deploy time
**Location:** `backend/app/main.py`, `config.py` (`cors_allow_origins` default `localhost:3000,127.0.0.1:3000`).
**Issue:** Not a wildcard; `allow_credentials=True` paired with a specific origin list. Correct and safe as configured for local dev. Operational risk only: whoever deploys must set `CORS_ALLOW_ORIGINS` to the real playtest frontend origin, not leave the localhost default. Also, `allow_credentials=True` is dead config — there is no auth/cookie anywhere in this design.
**Fix direction:** Set `allow_credentials=False` (nothing uses credentialed CORS here) and confirm `CORS_ALLOW_ORIGINS` per environment at deploy. DevOps deploy-config item, not a code defect.

### 5. [Info — RESOLVED on re-verification] Company-name client-side validation
**Original concern:** reviewer could not find a frontend creation form, so only the server-side `max_length=40` backstop was confirmed.
**Re-verified:** `frontend/components/company-creation/` DOES exist. `validation.ts` enforces name length 1-40 and rejects blank/whitespace-only client-side, and the backend `models.py` `min_length=1, max_length=40` remains the un-bypassable backstop. Both layers present, matching architecture Section 5's intent. **No action needed.**

---

## What was checked and came back clean

- **XSS-via-narrative (RE-VERIFIED against the real UI):** `EventCard.tsx` renders `event.narrative`, `choice.label`, and `choice.description` as plain JSX children (`{event.narrative}` etc.), which React auto-escapes. A repo-wide search found **zero** uses of `dangerouslySetInnerHTML` and no raw-HTML/markdown renderer. The untrusted AI-generated text cannot inject markup. **Closed — safe.** (Keep this invariant if a richer event presentation is built later in Phase 4 polish.)
- **Prompt-injection hardening (ai_client.py):** `companyName` is the only free-text field reaching the prompt; inserted via a delimited `<company_name>...</company_name>` tag, not concatenated into instruction text. System prompt instructs the model to treat context content as data, not commands. All other context fields (`industry`, `founderType`, `severityHint`) are closed `Literal[...]` enums in `models.py` — Pydantic rejects anything out-of-enum before it reaches the prompt. Matches design intent; real, not just commented.
- **Output validation (validation.py):** Genuinely sound. `choices` length constrained to {2,3}; every numeric consequence field checked for real numeric type (explicitly rejects `bool` and non-numeric via `isinstance(value, bool) or not isinstance(value, (int, float))`), `math.isfinite` (blocks `NaN`/`Infinity`), and bounded relative to the request's own `cash`/`customerCount`. Text fields max-length capped. Any violation → fallback. A real backstop, not theater.
- **Secret handling (config.py, .env.example, .gitignore):** `OPENAI_API_KEY` never logged, never echoed in any response/error body; `.env` gitignored; `.env.example` ships blank. No-key stub path never touches the key.
- **Error handling (routes.py):** Errors return only generic structured codes (`{"error": "timeout"|"upstream_error"|"invalid_response"}`) — no stack traces, no raw OpenAI exception text, no internal paths. Details go only to server-side logs.
- **localStorage / save-blob handling (storage.ts):** Straightforward `JSON.parse`/`stringify` with try/catch returning `null` on corrupt JSON — no `eval`, no unsafe deserialization. A tampered save can set arbitrary numeric fields, but this is single-player client-side state with no server trust boundary — a cheating vector, not a vulnerability, and correctly out of scope for v1 (no leaderboard/multiplayer).
- **No secrets shipped to client:** Frontend references only `NEXT_PUBLIC_AI_PROXY_URL` (a base URL). No key/credential in any frontend file.
- **Dependencies:** Backend versions pinned (`fastapi==0.115.6`, `openai==1.59.6`, etc.). Frontend on current majors (Next 16, React 19). A full CVE scan (`pip-audit`/`npm audit`) was not run — recommend running one before the real key goes live; nothing in the pinned list is known-bad.

## HIPAA/regulatory relevance
None applicable — single-player game, no PHI/PII by design (no accounts, no personal data fields in `GameState`).

## Summary — blocking vs. deferrable

**Fix before the real key goes live behind any public-reachable URL:**
- **Finding 1 (rate limiting)** — the one must-fix.
- **Finding 2 (body size cap)** — cheap to bundle with Finding 1.

**Fine for internal playtest as currently configured (stub mode or a non-public URL):**
- Finding 3 (invalid_response alerting) — nice-to-have.
- Finding 4 (CORS credential flag cleanup) — hygiene.
- Finding 5 (client-side name validation) — RESOLVED, present.
- XSS-via-narrative — RESOLVED, safe (escaped JSX, no `dangerouslySetInnerHTML`).
