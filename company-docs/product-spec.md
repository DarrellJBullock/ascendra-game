# Ascendra — Product Spec (v1)

## Vision / Positioning

Ascendra is an AI-powered startup simulation game where players build a technology company week by week — making product, hiring, and fundraising decisions while an AI-driven event engine throws realistic curveballs at them. It aims to feel less like a spreadsheet toy and more like a "founder command center": a game where every week you can see your company's momentum shift, and where no two playthroughs unfold the same way because the AI is reacting to your specific state, not a script.

## V1 Goal

V1 exists to answer one question: **is the core loop — advance a week, react to an event, watch your metrics move, decide what to do next — actually fun on its own, before any polish or breadth is added?** If a player will voluntarily play through 15-20 turns of a plain-looking build just to see what happens to their company, the loop works and we invest further. If they get bored by turn 5, no amount of glassmorphism or additional feature breadth will save it, and we need to rework the loop itself before building anything else.

V1 is not a demo of the full vision. It is the smallest complete game that could plausibly ship and be replayed.

## V1 Scope

Rationale for this cut: a game needs (1) a starting decision that creates meaningful variance between playthroughs, (2) an engine that advances time and produces consequences, (3) a way to see those consequences, (4) at least one source of unpredictability/tension, and (5) a reason to care about running out of money. That's company creation, the turn engine, the dashboard, one AI event category, and basic fundraising — the five items below. Everything else in the source spec is depth or polish on top of this loop, not the loop itself.

### 1. Company Creation

**Description:** Player names their company, picks an industry and a founder background. This sets starting stats and modifiers used by the turn engine for the rest of the game.

**Scope for v1:**
- Industries: reduce the source spec's 8 down to **3** — AI, Fintech, Ecommerce. These three give distinctly different flavor (technical/regulated/consumer) without requiring the content team to write 8x the event and flavor text for v1.
- Founder backgrounds: keep all **5** from the source spec (Engineer, Product Manager, Sales Leader, Marketing Expert, Finance Executive) — these are cheap to implement (a handful of numeric modifiers each) and are the main source of replayability in v1, so we keep them all rather than cutting.

**User stories:**
- As a player, I want to name my company and choose an industry and founder type, so my playthrough feels like "mine" from turn 1.
- As a player, I want the founder type I pick to visibly affect how my company behaves (not just flavor text), so the choice feels meaningful.

**Acceptance criteria:**
1. Player can enter a company name (1-40 characters, required, no blank/whitespace-only names accepted).
2. Player must select exactly one of 3 industries and one of 5 founder types before starting; the "Start" action is disabled until both are selected.
3. Each founder type applies at least 2 documented starting modifiers to gameplay stats (e.g., Engineer: +X% feature dev speed, -Y% technical debt accrual, -Z% customer acquisition speed). Modifiers must be visible to the player in a summary before they confirm.
4. Starting cash, starting team size, and starting product state are identical across industries in v1 (industry affects event flavor/content in v1, not starting stats) — this is a deliberate simplification, stated explicitly so it isn't mistaken for a bug.
5. Once confirmed, a new game record is created and the player lands on the Dashboard at Week 1.

### 2. Weekly Turn Engine

**Description:** The core clock of the game. Each time the player advances a week, the engine processes revenue, expenses, burn, customer growth/churn, and rolls for an event.

**Scope for v1:**
- Advancing a turn is a single explicit player action ("Advance Week" / "End Week") — no real-time or idle simulation in v1.
- Per-turn processing (deliberately narrow): revenue calculation from current customer count and pricing, fixed + salary expenses, cash burn, simple customer growth/churn based on current product quality and marketing spend (if any), and technical debt drift.
- No product management screen, no team management screen, no marketing/sales pipeline in v1 — see Out of Scope. The turn engine in v1 uses a small number of adjustable levers (see #3) rather than full sub-systems.

**User stories:**
- As a player, I want to click "Advance Week" and see my company's numbers change in response to the state I'm in, so I feel like decisions compound over time.
- As a player, I want each week to take a few seconds to resolve, not feel like a wall of unreadable numbers.

**Acceptance criteria:**
1. Advancing a week always updates: cash on hand, MRR, burn rate, runway (weeks of cash remaining at current burn), customer count, technical debt, and valuation.
2. Turn processing is deterministic given the same starting state and same player inputs (no hidden non-determinism outside the event roll in #4) — this makes the loop debuggable and testable.
3. If cash on hand reaches $0 or below, the game ends in a "Bankruptcy" state; player cannot advance further weeks.
4. If valuation reaches or exceeds **$1,000,000** (the v1 Success threshold), the game ends in a "Success" state; player is shown a success summary and cannot advance further weeks.
5. Valuation is computed by a simple, documented formula — a revenue multiple (e.g., annualized MRR × a fixed multiple), optionally re-anchored by the most recent accepted fundraising offer's implied valuation. No DCF, no market-comparable, no competitor-driven valuation in v1.
6. A full week of processing (calculation + event resolution, excluding player think-time) completes and renders in under 2 seconds under normal conditions.
7. Each week's outcome is stored (or at least the resulting state is), such that the dashboard history/charts in #3 can display trends across at least the most recent 12 weeks.

### 3. Dashboard (Core Metrics + History)

**Description:** The single primary screen. Shows current state and recent trend so the player can read "is this going well?" at a glance.

**Scope for v1:**
- Metrics shown: cash on hand, MRR, burn rate, runway, customer count, team size (static/display-only in v1, see below), technical debt, and valuation. Valuation is included in v1 because the Success end state is valuation-based ($1M) — it uses the simple formula in Feature 2, not a full valuation system.
- Explicitly cut from v1 dashboard vs. source spec: ARR (derivable from MRR, not worth a separate line yet), investor confidence, team morale, and product quality as live-tracked stats — deferred because they depend on sub-systems (team management, product management) that are themselves deferred or minimal in v1.
- One simple trend chart (revenue over time) is in scope; the source spec's full multi-chart suite (customer growth, valuation, burn rate as separate charts) is deferred — one chart proves the "growth is visible" concept without requiring a charting-heavy build.

**User stories:**
- As a player, I want to see my key numbers the moment I land on the game, so I always know if I'm in trouble or doing well.
- As a player, I want to see a simple trend, not just a single point-in-time number, so I can tell if things are improving or declining.

**Acceptance criteria:**
1. Dashboard displays current values for: cash, MRR, burn rate, runway (in weeks), customer count, technical debt, and valuation — updated immediately after each week advances.
2. Runway displays a clear low-cash warning state (e.g., visually distinct) when runway drops below 4 weeks.
3. A revenue-over-time line/area chart renders showing at minimum the last 12 completed weeks (or all completed weeks if fewer than 12).
4. All dashboard numbers match the values produced by the turn engine for that week — no discrepancy between engine output and displayed value (verifiable via a fixed test playthrough).
5. Dashboard is usable (all numbers legible, chart renders without overlap/errors) at common desktop widths (1280px+); mobile/responsive polish is not required for v1.

### 4. AI Event Engine — Single Category (Engineering events)

**Description:** The signature mechanic: weekly-rolled situations that inject tension and require a choice. V1 implements exactly **one** category from the source spec's five (Engineering — outages, security concerns, tech debt crises) rather than all five.

**Rationale for choosing Engineering:** it ties directly to a stat the turn engine already tracks in v1 (technical debt), doesn't require the People, Customer, Investor, or Market sub-systems to exist yet, and produces consequences (cash cost, customer/churn impact, technical debt change) using only mechanics already in v1's turn engine.

**Scope for v1:**
- Events are rolled with some probability each week, influenced by current technical debt (higher debt = higher chance/severity of an event).
- Each event presents a short narrative and 2-3 discrete choices with different tradeoffs (e.g., "patch quickly and cheaply, debt stays high" vs. "invest more time/cash, debt drops").
- AI-generated narrative text for the event, with a **deterministic templated fallback** if the AI call fails or times out — the game must never block or break because an AI call didn't return. Fallback events use pre-written templates with the same choice/consequence structure, just non-AI-generated flavor text.
- Consequences are applied immediately via the same numeric levers the turn engine already uses (cash, technical debt, customer count/churn) — no new stat types introduced solely for events.

**User stories:**
- As a player, I want unpredictable situations to show up that force me to make a tradeoff, so every playthrough feels different and every week feels like it matters.
- As a player, I want the event text to feel relevant to my company (not generic), so it feels alive.
- As a player, I want the game to keep working smoothly even if the AI text generation is slow or fails, so a bad network moment doesn't ruin my session.

**Acceptance criteria:**
1. Over a 20-week playthrough under default settings, at least 4 and no more than 10 engineering events fire (bounds are tunable but must be enforced so events feel meaningful, not either absent or constant).
2. Every event presents exactly 2 or 3 choices, each with a visibly different described tradeoff, and selecting a choice is required to proceed to the next week (no silently-skippable events).
3. Each choice deterministically applies its stated numeric consequences to the relevant stats (cash, technical debt, customer count) — consequences must match what's described in the choice text within reasonable rounding.
4. If the AI generation call fails, times out (>5s), or returns malformed content, the game substitutes a pre-written templated event with equivalent choice/consequence structure, and the player experiences no error, crash, or stuck state.
5. Event probability/severity visibly correlates with technical debt: a fixed test where technical debt is held artificially high produces a measurably higher event rate over 20 weeks than a test where it's held low.

### 5. Fundraising (Basic)

**Description:** A minimal fundraising flow so cash-out isn't the only lever and so the "raise money to survive/grow" fantasy exists in v1.

**Scope for v1:**
- Rounds available in v1: **Bootstrap (default/no raise), Angel, and Seed** only — Friends & Family, Series A, and Series B are cut for v1 (see Out of Scope) since they mostly add more of the same mechanic at higher numbers rather than new gameplay.
- Player can initiate a raise attempt; a single generated "investor" offer is presented with a valuation and equity ask (no negotiation, no multiple competing investor profiles, no board influence mechanic).
- Player can accept or decline the offer. Accepting adds cash and records equity given up; declining has no penalty in v1.
- No dilution math beyond simple percentage tracking; no cap table screen.

**User stories:**
- As a player, when I'm low on cash, I want the option to raise money, so I have a way to extend my runway besides cutting costs.
- As a player, I want the fundraising offer to reflect my company's current state (revenue/traction), so raising doesn't feel disconnected from how I'm doing.

**Acceptance criteria:**
1. Player can trigger a fundraising attempt at most once per week; the option is available starting Week 1 (bootstrap is the default state requiring no action).
2. The generated offer's valuation is influenced by current MRR and customer count (verifiable: two otherwise-identical saves with different MRR at time of raise produce different offer valuations, higher MRR -> higher valuation, all else equal).
3. Accepting an offer immediately adds the offered cash amount to cash on hand and records the equity percentage given up (visible somewhere on the dashboard, e.g., "Founder ownership: 82%").
4. Declining an offer returns the player to the dashboard with no state change other than the fact that they can't raise again that same week.
5. Angel round offers are available from Week 1; Seed round offers only become available once the company has reached a minimum MRR threshold (documented threshold, e.g., $5,000 MRR) — this reflects realistic staging without needing a full staged-round system.

## Out of Scope for v1 / Deferred

- **Full authentication system (subscriptions, guest mode, saved-game management UI):** v1 needs a single account can play a single game through to an end state; multi-save, guest mode, and subscription billing are business/infra concerns that don't affect whether the core loop is fun. → Phase 2+.
- **Additional industries (Healthcare, Cybersecurity, Gaming, Education, Developer Tools):** more flavor variety, not more gameplay depth; cheap to add once the loop is validated. → Phase 2.
- **Team management (hiring, promotions, reviews, individual employee profiles):** a full sub-system with its own data model; v1 uses team size as a static/derived number so we can validate the turn/event loop without building an entire HR simulation first. → Phase 2.
- **Product management screen (features, bugs, releases, innovation score):** technical debt is tracked directly by the turn engine in v1 without a full product sub-system on top; building the full product management UI before we know the loop is fun risks wasted work. → Phase 2.
- **Full customer segment depth (Small Business/Mid-Market/Enterprise/Government, contracts, support tickets):** v1 uses a single undifferentiated customer count; segment depth adds strategic texture but isn't needed to prove the core loop. → Phase 3.
- **Marketing sub-system (campaign types, CAC/LTV, brand awareness):** a full lever system that mainly feeds the turn engine's growth math; v1's growth math is intentionally simple until the loop is proven. → Phase 3.
- **Sales pipeline (stages, forecasts):** same reasoning as marketing — real depth, but depth on a loop we haven't validated yet. → Phase 3.
- **Full financial center (income statement, cash flow statement, balance sheet):** v1 exposes the handful of numbers players need to make decisions; full statements are a "trust/depth" feature for players who are already engaged, not a v1 hook. → Phase 3.
- **Competitor intelligence (AI-generated competitors, market map):** requires its own generation and simulation logic; adds strategic depth but is not required to test whether turn-to-turn decisions are engaging. → Phase 3/4.
- **Remaining AI event categories (Customer, People, Investor, Market):** v1 deliberately tests with one category to keep the AI integration and fallback logic scoped; once proven, the same pattern extends to the other four. → Phase 2 (Investor/People events, since fundraising already exists) then Phase 3 (Customer/Market).
- **AI board meetings:** depends on investor/board mechanics and team mechanics not present in v1. → Phase 3.
- **AI founder advisor (persistent chat):** a meaningfully separate AI feature (conversational, context-aware) rather than an extension of the event engine; risks becoming its own multi-week effort if pulled into v1. → Phase 3.
- **News system:** depends on competitor intelligence and market events existing first to have anything to report on. → Phase 3/4.
- **Multiple endgame paths (Unicorn, IPO, acquisition, lifestyle business):** v1 needs only two end states to prove the stakes matter — Bankruptcy (already in scope, cash hits $0) and a simple "Success" milestone (e.g., reach a target valuation or MRR threshold). Full path variety is a reward for continued play once the core loop is validated, not a v1 requirement. → Phase 2 (add 1-2 more paths) then Phase 4 (full set).
- **Additional fundraising rounds (Friends & Family, Series A, Series B):** more of the same mechanic at different numbers; not new gameplay. → Phase 2/3.
- **Full world-class visual/animation polish (glassmorphism, cinematic event cards, animated counters, dynamic lighting, competitive positioning maps):** explicitly called out in the source spec's own phasing note as a post-validation pass; building this before the loop is proven fun is the single biggest risk of this project stalling. → Phase 4 (post-validation).
- **Dark/light theme system:** cosmetic, not load-bearing for validating the loop. → Phase 4.

## Key Assumptions

- A single playable event category (Engineering) generates enough variety and tension to be judged fairly on "is this fun," rather than needing all five categories to feel complete.
- Players will tolerate a visually plain (non-"world-class design") build in v1 as long as the numbers and events are legible and responsive.
- Simple/derived growth and churn math (not a full marketing/sales/customer-segment model) is sufficient to make weekly numbers feel meaningfully responsive to player choices.
- Two end states (Bankruptcy, Success-threshold) are enough to give weekly decisions stakes, without needing the full endgame path variety.

## Primary Risks

1. **The loop might not be fun with only one event category.** If Engineering events alone feel repetitive or shallow, we won't know if that's a fundamental core-loop problem or just a content-breadth problem — mitigate by watching playtest feedback specifically for "boring" vs. "wanted a different kind of surprise."
2. **AI generation latency/cost/failure could degrade the experience if the fallback isn't robust.** The deterministic templated fallback (see Feature 4, AC #4) is the mitigation; it must be tested as thoroughly as the AI path itself, not treated as an afterthought.
3. **Simplified growth/churn math might make the game feel too random or too flat** (i.e., outcomes don't feel connected to player choices) since the deeper systems (product, team, marketing) that would normally drive nuance are deferred. Mitigate by tuning the technical-debt-to-event-rate and MRR-to-customer-growth relationships explicitly and testing they're perceptible to a player, not just correct in a spreadsheet.
4. **Scope creep during build** — because the source spec is detailed and enticing, engineering may be tempted to "just add" a deferred feature. This spec and the Out of Scope list are the guardrail; Architect and engineering should treat anything not explicitly listed above as v1 as out of scope.

## Success Metric for V1

**Median session length across playtesters reaches at least 15 completed in-game weeks without the player quitting out of boredom (self-reported or observed), across a test group of at least 8 playtesters.** This is the single metric because it directly measures the thing v1 exists to test — whether the core loop holds attention on its own — rather than measuring engagement with any feature we've deliberately deferred.

## Data Flag

**NO** — v1 as scoped introduces no new categories of data collection beyond what's needed to run and persist a single-player game session (game state, turn history, event choices). No PII beyond what a basic account requires, no new sharing/retention model. If authentication/subscriptions (deferred to Phase 2+) are built later, that phase should be re-flagged for Legal/Compliance review at that time, since account/billing data does raise new considerations.

## Resolved Decisions (business calls made before Architect proceeds)

These four questions were open at spec time and have now been decided by the product owner:

1. **Account model for v1: Local-only, no login.** V1 ships with no auth layer — game state persists locally (browser/local storage). Architect defers the entire auth/persistence-across-sessions layer to Phase 2. Consequence: no cross-device play and no server-side saves in v1, which is acceptable for a single internal-playtest round.
2. **"Success" endgame threshold: $1,000,000 valuation.** Reaching a $1M valuation ends the game in the Success state. Consequence (folded into scope above): v1 now computes and displays a simple revenue-multiple valuation (Feature 2, ACs #4–5; Feature 3) — this is the one scope addition versus the original cut, which had deferred valuation entirely.
3. **Playtesters: internal team / colleagues.** The 8+ playtesters for the success metric are drawn from the internal team. Fastest to recruit; accept the forgiving-audience bias and watch for it when reading boredom signals.
4. **AI cost tolerance: keep it cheap, lean on the fallback.** The AI integration layer should call the model sparingly (cache/template heavily, use AI for flavor text only) and rely aggressively on the deterministic templated fallback. This keeps per-session cost and latency low during the internal playtest; no hard budget cap was set, but "cheap by design" is the operating constraint.
