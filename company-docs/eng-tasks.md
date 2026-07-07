# Ascendra v1 — Engineering Task Breakdown (Phase 1 build)

Source of truth: `company-docs/architecture.md` (system design) and `company-docs/product-spec.md` (feature ACs). This document exists to turn that architecture into a sequenced, assignable task list for Phase 1. Strictly v1 scope — no Phase 2+ tasks are listed; where a task should leave a Phase-2 seam, it's noted inline per architecture Section 8.

Owner roles used below: `frontend-engineer`, `backend-engineer`, `tester`, `devops-engineer`, `product` (content/tuning, non-code).

---

## Epic A — Data Model & Core Types (foundation, blocks almost everything)

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| DM-1 | Implement `GameState` and all sub-types (`Company`, `GameMetrics`, `TurnHistoryRecord`, `EventLogRecord`, `EventChoice`, `FundraisingOffer`) exactly per architecture.md Section 3, including `schemaVersion: 1` field | frontend-engineer | none | S | Feature 1 AC #5 (game record created); enables all other ACs |
| DM-2 | Implement Zustand store wrapping `GameState`, with actions as thin wrappers (no business logic in the store itself — logic lives in Epic B pure functions) | frontend-engineer | DM-1 | S | — |
| DM-3 | Implement `localStorage` persistence: save-on-every-mutating-action, load-on-app-boot, handle "no save exists yet" vs "save exists" boot paths | frontend-engineer | DM-2 | S | Resolved Decision #1 (local-only persistence) |
| DM-4 | Unit tests for DM-1/DM-2/DM-3: state shape roundtrips through serialize/deserialize without loss, store actions mutate expected fields only | tester | DM-1, DM-2, DM-3 | S | Feature 2 AC #2 (determinism groundwork) |

**Note:** `schemaVersion` field (DM-1) is the Phase-2 seam for future save migration — no migration logic is built in v1, just the field.

---

## Epic B — Deterministic Turn Engine

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| TE-1 | Implement Financial Engine calc: revenue from customerCount × price, fixed + salary expenses, burn, cash update, MRR update | frontend-engineer | DM-1 | M | Feature 2 AC #1, #2 |
| TE-2 | Implement customer growth/churn calc (simple function of product-quality proxy + industry/founder modifiers) | frontend-engineer | DM-1 | M | Feature 2 AC #1, #2 |
| TE-3 | Implement technical debt drift calc, modified by founder `technicalDebtAccrualMult` | frontend-engineer | DM-1 | S | Feature 2 AC #1, #2 |
| TE-4 | Implement `computeValuation()`: annualized-MRR × constant multiple, re-anchored by last accepted fundraising offer if present | frontend-engineer | TE-1 | S | Feature 2 AC #5 |
| TE-5 | Implement `runwayWeeks` derivation (cash / burnRate, handle burnRate<=0 edge case) | frontend-engineer | TE-1 | S | Feature 2 AC #1; Feature 3 AC #2 |
| TE-6 | Implement `checkEndStates()`: cash<=0 → Bankruptcy, valuation>=$1,000,000 → Success, else in_progress; block further "Advance Week" once ended | frontend-engineer | TE-4 | S | Feature 2 AC #3, #4 |
| TE-7 | Compose `advanceWeek()` pipeline (TE-1 → TE-2 → TE-3 → TE-4 → event roll [Epic C] → TE-6), pure function, accepts optional `rngSeed` | frontend-engineer | TE-1, TE-2, TE-3, TE-4, TE-6 | M | Feature 2 AC #2, #6 |
| TE-8 | Append `TurnHistoryRecord` on every completed week; cap/prune display slice to last 12 weeks for chart while keeping full session log | frontend-engineer | TE-7, DM-1 | S | Feature 2 AC #7; Feature 3 AC #3 |
| TE-9 | **Tuning constants pass**: set `REVENUE_MULTIPLE`, base price-per-customer, expense/salary constants, growth/churn coefficients, technical-debt drift rate — via actual test playthroughs against spec ACs (Feature 2 AC #6 timing budget, Primary Risk #3 perceptibility) | product | TE-7 | M | Feature 2 AC #5, #6; Primary Risk #3 |
| TE-10 | Unit + scenario tests: fixed-input determinism (same start state + inputs ⇒ identical output across runs), performance test (<2s for full week resolution excl. think-time), bankruptcy/success triggering at correct thresholds | tester | TE-7, TE-8, TE-9 | M | Feature 2 AC #2, #3, #4, #6 |

**Go/no-go relevance:** TE-9 (tuning) is the single most fun-determining task in this epic — Primary Risk #3 explicitly calls out that flat/disconnected-feeling math is a core-loop-fun risk, not just a correctness risk.

---

## Epic C — Engineering Event Roll & Consequence Application (deterministic side)

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| EV-1 | Implement `rollEngineeringEvent(technicalDebt, rngSeed)`: probability/severity weighted by current technical debt, returns `{fired, severity}` | frontend-engineer | DM-1 | M | Feature 4 AC #1, #5 |
| EV-2 | Implement `applyEventChoice()`: apply a chosen `EventChoice.consequences` to cash/technicalDebt/customerCount, append `EventLogRecord` | frontend-engineer | DM-1, TE-7 | S | Feature 4 AC #2, #3 |
| EV-3 | **Event-rate/severity tuning pass**: tune EV-1's probability curve so a 20-week playthrough fires 4-10 events, and high-vs-low technical debt produces a measurably different rate | product | EV-1, TE-9 | M | Feature 4 AC #1, #5 |
| EV-4 | Tests: 20-week simulated run bounds-check event count (4-10), high-debt vs low-debt fixed test shows measurable rate difference, choice consequences match description within rounding | tester | EV-1, EV-2, EV-3 | M | Feature 4 AC #1, #3, #5 |

**Go/no-go relevance:** EV-3 is the other primary tuning lever for core-loop fun (Primary Risk #1 — is Engineering-only variety enough) and is directly measured by the v1 success metric via playtesting.

---

## Epic D — AI Event Narrative Integration (backend)

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| BE-1 | Scaffold FastAPI service: no DB, no auth, single `POST /v1/events/generate` route + `GET /v1/health` | backend-engineer | none (parallel to Epic A/B) | S | architecture.md Section 6 |
| BE-2 | Implement OpenAI call: build prompt from request `context` (trigger, industry, founderType, week, technicalDebt, cash, mrr, customerCount, severityHint); use structured/JSON-mode output if available | backend-engineer | BE-1 | M | AI Integration Layer contract (architecture.md Section 5) |
| BE-3 | Implement strict response schema validation server-side (narrative non-empty/length-capped, choices.length in {2,3}, all consequence fields present/numeric/bounded); return structured error on failure rather than passing through malformed content | backend-engineer | BE-2 | M | Feature 4 AC #4 |
| BE-4 | Basic prompt-injection hardening: company name inserted via delimited template slot only, system prompt constrains output to schema, no other free-text fields in context | backend-engineer | BE-2 | S | architecture.md Section 5 (basic hardening) — flag for Security Reviewer |
| BE-5 | Unit/integration tests: valid response passes, malformed responses (missing field, wrong choice count, out-of-bounds delta, broken JSON) are all rejected server-side | tester | BE-3 | M | Feature 4 AC #4 |
| BE-6 | Deploy config: single secret (`OPENAI_API_KEY`), no persistent storage, containerized, health-check wired for uptime monitoring | devops-engineer | BE-1 | S | architecture.md Section 7 (DevOps note) |

---

## Epic E — AI Fallback Path (frontend, co-equal to Epic D per spec Risk #2)

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| CT-1 | **Author fallback template content**: pre-written narrative + 2-3 choices per (industry × severity band) combo for the Engineering category, matching the same choice/consequence shape as AI output | product | DM-1 | M | Feature 4 AC #4 |
| FE-1 | Implement fallback template lookup/selection function keyed by (industry, severityBand) | frontend-engineer | CT-1, DM-1 | S | Feature 4 AC #4 |
| FE-2 | Implement `generateEventNarrative()`: calls BE-1's endpoint, enforces hard 5s client-side timeout, validates response client-side defensively, routes to FE-1 fallback on any failure/timeout/malformed response — single unified return shape (`{event, source: "ai"|"fallback"}`) regardless of path | frontend-engineer | BE-3, FE-1, EV-1 | M | Feature 4 AC #4; Primary Risk #2 |
| FE-3 | Wire `generateEventNarrative()` result into the `advanceWeek()` pipeline so downstream consequence-application code (EV-2) never branches on source | frontend-engineer | FE-2, TE-7 | S | Feature 4 AC #2, #3 |
| FE-4 | Tests: forced AI failure/timeout/malformed-response scenarios all resolve to a fallback event with no crash/stuck state; fallback event has correct 2-3 choice shape | tester | FE-2, CT-1 | M | Feature 4 AC #4 (explicit "must be tested as thoroughly as the AI path") |

**Go/no-go relevance / build-order note:** Per architecture.md and Primary Risk #2, FE-1 through FE-4 must be functionally complete and tested independent of Epic D — the fallback path should be demoable and playable even with BE-1..BE-6 entirely stubbed out or offline. Do not treat CT-1/FE-1..4 as "finish after AI integration."

---

## Epic F — Company Creation UI

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| FE-5 | Build company-creation screen: name input (1-40 chars, reject blank/whitespace-only), industry select (3 options), founder-type select (5 options) | frontend-engineer | DM-1 | M | Feature 1 AC #1, #2 |
| FE-6 | Define and display founder modifier data (per founder type, >=2 documented modifiers) in a summary panel before confirm | frontend-engineer | FE-5 | S | Feature 1 AC #3 |
| FE-7 | Wire "Start" button: disabled until both selections made; on confirm, create `GameState` via DM-1/DM-2 and route to Dashboard at Week 1 | frontend-engineer | FE-5, FE-6, DM-2 | S | Feature 1 AC #2, #5 |
| FE-8 | Tests: validation rules (name length/blank), Start disabled until both fields set, identical starting cash/team/product state across industries (AC #4 — explicit "not a bug" check) | tester | FE-7 | S | Feature 1 AC #1, #2, #4, #5 |

**Phase-2 seam note:** industry selection UI should be built as a simple extensible list (not hardcoded to exactly 3 in a way that requires structural rework) since Phase 2 adds 5 more industries — no Phase 2 work is done now, just avoid a throwaway 3-case switch.

---

## Epic G — Dashboard (core metrics + trend chart)

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| FE-9 | Build dashboard layout displaying cash, MRR, burn rate, runway, customer count, team size (static), technical debt, valuation, founder ownership % | frontend-engineer | DM-2, TE-7 | M | Feature 3 AC #1 |
| FE-10 | Implement low-runway visual warning state (<4 weeks) | frontend-engineer | FE-9 | S | Feature 3 AC #2 |
| FE-11 | Implement revenue-over-time chart (Recharts) reading from `turnHistory`, last 12 weeks or fewer | frontend-engineer | TE-8, FE-9 | M | Feature 3 AC #3 |
| FE-12 | "Advance Week" action wiring: triggers `advanceWeek()` (Epic B/C/E composed pipeline), re-renders dashboard from updated store | frontend-engineer | TE-7, FE-3, FE-9 | S | Feature 2 AC #1; Feature 3 AC #1 |
| FE-13 | Tests: dashboard values match engine output for a fixed test playthrough (no discrepancy), layout usable at 1280px+, chart renders without overlap for 1-12+ week histories | tester | FE-9, FE-10, FE-11, FE-12 | M | Feature 3 AC #1, #3, #4, #5 |

**Phase-2 seam note:** dashboard intentionally omits ARR, investor confidence, team morale, live product-quality — layout should leave room to add metric tiles later without a redesign, but none are built now.

---

## Epic H — Event UI (presentation of Epic C/E output)

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| FE-14 | Build event card component: narrative text + 2-3 choice buttons with tradeoff descriptions, modal/blocking until a choice is made (no silent skip) | frontend-engineer | FE-2 | M | Feature 4 AC #2 |
| FE-15 | Wire choice selection to `applyEventChoice()` (EV-2) and continue the week-advance flow to completion | frontend-engineer | FE-14, EV-2 | S | Feature 4 AC #2, #3 |
| FE-16 | Tests: event always presents exactly 2-3 choices, next-week action is blocked until a choice is made, chosen consequences visibly reflected in dashboard after resolution | tester | FE-15 | S | Feature 4 AC #2, #3 |

---

## Epic I — Fundraising (Bootstrap/Angel/Seed)

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| FE-17 | Implement `generateFundraisingOffer(roundType, metrics, founderMods)`: valuation/equity derived from current MRR and customer count; Angel available from Week 1, Seed gated on documented MRR threshold (e.g. $5,000) | frontend-engineer | DM-1, TE-4 | M | Feature 5 AC #2, #5 |
| FE-18 | Build fundraising UI: trigger raise attempt (max once/week), display generated offer, accept/decline actions | frontend-engineer | FE-17, DM-2 | M | Feature 5 AC #1, #3, #4 |
| FE-19 | Implement accept flow: add cash immediately, record equity given up / update `founderOwnershipPct`, display on dashboard | frontend-engineer | FE-18, FE-9 | S | Feature 5 AC #3 |
| FE-20 | Implement decline flow: no state change besides once-per-week lock | frontend-engineer | FE-18 | S | Feature 5 AC #4 |
| FE-21 | Tests: offer valuation varies correctly with MRR (two saves, different MRR, higher MRR → higher valuation), once-per-week enforcement, Seed unavailable below MRR threshold, ownership % updates correctly on accept | tester | FE-19, FE-20 | M | Feature 5 AC #1, #2, #3, #4, #5 |

---

## Epic J — End States (Bankruptcy / Success)

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| FE-22 | Build Bankruptcy end screen (triggered by TE-6); disable further "Advance Week" | frontend-engineer | TE-6, FE-9 | S | Feature 2 AC #3 |
| FE-23 | Build Success end screen with summary (triggered by TE-6 at $1M valuation); disable further "Advance Week" | frontend-engineer | TE-6, FE-9 | S | Feature 2 AC #4 |
| FE-24 | Tests: both end states correctly halt further play and display appropriate summary | tester | FE-22, FE-23 | S | Feature 2 AC #3, #4 |

---

## Epic K — Cross-Cutting QA & Playtest Readiness

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| QA-1 | Full end-to-end fixed test playthrough script (deterministic seed) covering company creation → 20 weeks → an end state, asserting dashboard/engine/event/fundraising values match expected at each step | tester | FE-13, FE-16, FE-21, FE-24, TE-10, EV-4 | L | Feature 2 AC #2; Feature 3 AC #4; ties together all feature ACs |
| QA-2 | Recruit + run internal playtest round (8+ colleagues), track session length (weeks reached before quit/boredom) against the 15-week median success metric | product | QA-1 | M | V1 Success Metric |
| QA-3 | Basic error/crash monitoring during playtest (client-side error boundary around event/turn flow at minimum) so a crash doesn't silently end a playtester's session without signal | frontend-engineer | FE-9 | S | Primary Risk #2 (robustness) |

**Go/no-go relevance:** QA-2 is the actual go/no-go gate for the whole project (roadmap Phase 1 goal). Everything else in this document exists to make QA-2 measure the real thing (loop fun) rather than measuring bugs/crashes.

---

## Epic L — Deploy

| ID | Description | Owner | Depends on | Size | Satisfies |
|---|---|---|---|---|---|
| DO-1 | Frontend deploy pipeline (static/SSR Next.js build, e.g. to Vercel or equivalent) | devops-engineer | FE-13 (dashboard functional) | S | architecture.md Section 7 |
| DO-2 | Wire frontend env config to point at deployed AI proxy URL; confirm CORS/config correctness | devops-engineer | BE-6, DO-1 | S | architecture.md Section 6 |
| DO-3 | Smoke test full deployed stack (create company → advance week → trigger event via real AI call → confirm fallback works if proxy URL is broken intentionally) | tester | DO-2 | S | Feature 4 AC #4 end-to-end |

---

## Recommended Build Sequence / Critical Path

**Stage 0 (parallel start, Week 1 of build):**
- Epic A (Data Model: DM-1 → DM-4) — frontend-engineer, blocks nearly everything else.
- Epic D (BE-1, BE-6 scaffolding) — backend-engineer, fully parallel, no dependency on frontend.
- CT-1 (fallback content authoring) — product, can start immediately once event/choice shape (DM-1) is fixed; does not need engine code to exist.
- TE-9/EV-3 constants can begin as rough placeholders in parallel; final tuning happens after Stage 2.

**Stage 1 (serial-ish, depends on Epic A):**
- Epic B (Turn Engine: TE-1 → TE-8) — the deterministic core; nothing renders until this exists.
- Epic C (Event roll: EV-1, EV-2) can start as soon as DM-1 lands, in parallel with Epic B, then joins at TE-7.
- Epic F (Company Creation UI) can be built in parallel with Epic B/C since it only depends on DM-1/DM-2, but its "Start" action (FE-7) needs Epic B's `advanceWeek` to exist before the full flow is testable end-to-end.

**Stage 2 (join point — this is the critical path):**
- FE-2/FE-3 (fallback-integrated event narrative call) requires BOTH Epic D (BE-3 validation) and Epic E (CT-1, FE-1) to be done — this is the single most important join in the whole plan, per architecture Risk #2. **Do not let Epic D lag behind Epic B/C** — if AI integration is late, the fallback path alone should already make the game fully playable, so Epic E should be prioritized to completion even before Epic D finishes.
- Epic G (Dashboard) can be built in parallel with Stage 2 once Epic B/C basics exist (FE-9, FE-11 don't need the event system, just `GameMetrics`/`turnHistory`).
- Epic H (Event UI) depends on FE-2, so it follows Stage 2's join.
- Epic I (Fundraising) is independent of Epic C/D/E entirely — can be built any time after Epic A/B (TE-4 valuation) lands, fully parallel to Stage 2.
- Epic J (End states) is a light epic, drop in whenever TE-6 and the dashboard shell exist.

**Stage 3 (tuning — gates playtest readiness, not code-complete):**
- TE-9 (financial/growth tuning) and EV-3 (event rate/severity tuning) must happen against a fully wired, playable build — these are the "is it actually fun" levers and should not be rubber-stamped early with placeholder constants. Budget real iteration time here.

**Stage 4 (QA gate):**
- QA-1 (fixed playthrough test) exercises everything — schedule after all epics above are functionally complete.
- QA-2 (actual playtest round) is the go/no-go gate — do not run it until QA-1 passes and TE-9/EV-3 tuning has had at least one real iteration pass.

**Stage 5 (deploy, can overlap Stage 3/4):**
- Epic L can be stood up as soon as a runnable slice exists (even before full feature-complete) so DevOps isn't a bottleneck at the end — recommend standing up DO-1/DO-2 early (as soon as Epic G's dashboard is minimally functional) and just redeploying continuously.

**Always-runnable-slice guidance:** after Stage 1 + a stubbed Epic E (even placeholder fallback templates), the team has a playable-but-flavorless loop (creation → advance week → generic fallback events → dashboard). This is the earliest meaningful internal demo point and a good checkpoint before investing further in Epic D polish or tuning.

---

## Go/No-Go Summary

The tasks that most directly determine whether v1 hits its success metric (median 15+ weeks, 8+ playtesters, per product-spec.md) are:
- **TE-9** (financial/growth/churn tuning)
- **EV-3** (event rate/severity tuning)
- **CT-1** (fallback template content quality — since fallback fires often and must feel non-generic per user story in Feature 4)
- **QA-2** (the playtest itself)

Everything else is necessary infrastructure to make those four measurable and trustworthy, but is not itself where "fun or not" gets decided.
