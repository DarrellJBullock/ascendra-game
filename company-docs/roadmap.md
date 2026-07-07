# Ascendra — Roadmap

This roadmap sequences the full source concept (`ascendra-combined-spec.md`) across phases, starting from the v1 slice defined in `product-spec.md`. Every feature and deferred item from the source spec is mapped to a phase below — nothing from the original concept is silently dropped, it is sequenced.

## Sequencing Rules (apply across all phases)

1. **Prove the core loop is fun before investing in polish.** The "world-class design" pass (glassmorphism, animation, cinematic event cards, etc.) is explicitly held until after Phase 1's success metric is met. Building visual polish on an unvalidated loop is the single largest risk called out in the source spec's own phasing note.
2. **Architect designs schema and the AI integration layer before Frontend/Backend build anything.** This applies fresh at the start of every phase that introduces new data models (e.g., employees in Phase 2, competitors in Phase 3) — not just once at the start of the project. Each phase below lists this as a dependency where relevant.
3. **A phase does not start build work until the previous phase's goal has been evaluated.** Phase 2 should not begin in earnest until Phase 1's success metric (15+ median session weeks across 8+ playtesters) has a result, since a "no" result may mean reworking the loop rather than adding breadth.

---

## Phase 0 — Prep

**Theme:** Get ready to build v1 without guessing at architecture.

**Features/work:**
- Architect: design the core data schema (game state, weekly turn history, event log, fundraising offers) and the AI integration layer (event generation call + deterministic fallback contract) for exactly the v1 feature set in `product-spec.md`.
- Design against the now-resolved business decisions (see `product-spec.md` → Resolved Decisions): **local-only persistence, no auth layer** in v1; a **simple revenue-multiple valuation** feeding the **$1M Success** end state; **cheap-by-design AI usage** that leans hard on the deterministic fallback.

**Goal:** A schema and AI-layer design exist that Frontend/Backend can build against without re-litigating architecture mid-build.

**Sizing:** S

**Dependencies:** None blocking — the four business decisions that previously gated this phase are resolved. Architect can proceed.

---

## Phase 1 — V1 First Playable (the core loop)

**Theme:** Prove the core loop is fun.

**Features/work (per `product-spec.md`):**
- Company creation (3 industries, 5 founder types)
- Weekly turn engine (revenue, expenses, burn, churn, technical debt)
- Dashboard (core metrics + single revenue trend chart)
- AI event engine — Engineering category only, with deterministic fallback
- Simple revenue-multiple valuation (feeds the Success end state)
- Basic fundraising (Bootstrap, Angel, Seed only)
- Two end states: Bankruptcy (cash ≤ $0), Success ($1M valuation)
- Local-only persistence, no auth layer

**Goal:** Reach the v1 success metric — median 15+ completed weeks across 8+ internal-team playtesters without boredom-driven quit. This is a go/no-go gate for further investment.

**Sizing:** M

**Dependencies:** Phase 0 schema/AI-layer design complete. (Playtester group = internal team, and the $1M Success threshold are already decided — see `product-spec.md` → Resolved Decisions.)

---

## Phase 2 — Breadth Around the Proven Loop

**Theme:** Once the loop is proven fun, add the systems that give player choices more texture, without yet touching visual polish.

**Features/work:**
- Additional industries: Healthcare, Cybersecurity, Gaming, Education, Developer Tools (now industry can start affecting starting stats, not just flavor, if playtesting suggests that's warranted).
- Team management: hiring, promotions, reviews, terminations, individual employee profiles/attributes — this unlocks team size as a real lever instead of a static number.
- Product management screen: features, bugs, releases, innovation score — gives players direct control over the technical debt / product quality stats the event engine already reacts to.
- Second and third AI event categories: **Investor events** (ties naturally to fundraising, already in v1) and **People events** (ties naturally to the new team management system).
- Additional fundraising rounds: Friends & Family, Series A, Series B.
- 1-2 additional endgame paths beyond Bankruptcy/Success (e.g., Acquisition, Lifestyle Business) to start giving replay variety.
- Auth/persistence hardening if Phase 0/1 shipped a minimal or local-only account model: multi-save support, real login.

**Goal:** Validate that added systems increase engagement/replayability (not just add complexity) — track session length and repeat-play rate versus Phase 1 baseline.

**Sizing:** L

**Dependencies:** Architect must design new schema for employees and product/feature tracking before Backend builds Team Management or Product Management. Phase 1 success metric must have passed.

---

## Phase 3 — Strategic Depth

**Theme:** Add the systems that make the "startup command center" fantasy feel complete — deeper strategy, more AI surface area.

**Features/work:**
- Customer segment depth: Small Business, Mid-Market, Enterprise, Government segments with contracts, churn, expansion revenue, support tickets.
- Marketing sub-system: campaign types (SEO, content, paid ads, social, sponsorships, partnerships), CAC/LTV, brand awareness.
- Sales pipeline: Lead → Qualified → Demo → Proposal → Negotiation → Closed Won/Lost, with forecasting.
- Full financial center: income statement, cash flow statement, balance sheet (beyond v1's headline numbers).
- Remaining AI event categories: **Customer events**, **Market events** (competitor/downturn/regulatory) — completing all five categories from the source spec.
- Competitor intelligence (initial version): AI-generated competitors tracked on market share, product quality, pricing, funding — feeds the Market event category above.
- AI board meetings: quarterly, tied to the now-existing team and investor mechanics.
- AI founder advisor: persistent context-aware chat, now that there's a rich enough game state (product, team, customers, marketing, sales, finance) for it to meaningfully advise on.
- News system: generated ecosystem news, now that competitor intelligence and market events exist to report on.

**Goal:** The game now covers the full functional breadth of the source spec's systems 1-14; validate depth doesn't hurt the core loop's pacing (watch for turn-processing time and decision fatigue).

**Sizing:** L

**Dependencies:** Architect designs schema for customers/segments, marketing/sales pipeline, competitors, and news before respective builds. Competitor intelligence must exist before the Market event category and news system can reference it meaningfully.

---

## Phase 4 — Full Endgame Variety + World-Class Polish

**Theme:** The reward layer — complete the endgame variety and execute the full visual/animation polish pass now that the game is functionally complete and proven engaging.

**Features/work:**
- Full endgame path set: Unicorn ($1B valuation), IPO, Acquisition, Profitable Lifestyle Business, Bankruptcy — completing the set beyond Phase 1-2's minimal two-to-four paths.
- World-class design pass: glassmorphism, layered card interfaces, gradients, dynamic lighting, animated metric counters and charts, funding-announcement visual effects, cinematic event presentation (large event cards, contextual imagery, animated consequences), interactive competitive positioning map.
- Dark/light premium theme system.
- Subscription support and guest mode (business/monetization layer, not core gameplay) — should be scoped with input beyond Product/Architect (e.g., business/monetization stakeholders) given billing implications.

**Goal:** Deliver the "feels like I'm running the next billion-dollar company" experience the source spec targets, on top of a game already proven fun and functionally complete.

**Sizing:** L

**Dependencies:** All Phase 1-3 systems functionally complete (polish pass touches nearly every screen, so late-breaking functional changes would waste polish work). Architect/Designer collaboration on final visual system before Frontend executes.

---

## Traceability: Every Deferred Item's Phase

| Deferred item (from source spec) | Phase |
|---|---|
| Additional industries (Healthcare, Cybersecurity, Gaming, Education, Dev Tools) | 2 |
| Team management (hiring/promotion/reviews/employee profiles) | 2 |
| Product management (features/bugs/releases/innovation score) | 2 |
| Investor + People AI event categories | 2 |
| Friends & Family, Series A, Series B fundraising rounds | 2 |
| Additional endgame paths (initial 1-2 beyond Success/Bankruptcy) | 2 |
| Full auth (multi-save, real login) if not done in Phase 0/1 | 2 |
| Customer segment depth (SMB/Mid-Market/Enterprise/Gov, contracts, tickets) | 3 |
| Marketing sub-system (campaigns, CAC/LTV, brand awareness) | 3 |
| Sales pipeline (stages, forecasting) | 3 |
| Full financial statements (income/cash flow/balance sheet) | 3 |
| Customer + Market AI event categories (completes all 5) | 3 |
| Competitor intelligence (initial) | 3 |
| AI board meetings | 3 |
| AI founder advisor (persistent chat) | 3 |
| News system | 3 |
| Full endgame path set (Unicorn, IPO, Acquisition, Lifestyle) | 4 |
| World-class design/animation polish pass | 4 |
| Dark/light theme system | 4 |
| Subscriptions, guest mode | 4 |
