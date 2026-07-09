// Tuning constants for the simulation engine.
//
// TE-9 / EV-3 TUNING PASS COMPLETE (Stage 3): the values below have been
// balanced against `scripts/tuningSim.ts`, a headless harness that runs many
// seeded full playthroughs through the real engine under two strategies
// (Passive / Strong) and measures event-rate, debt-correlation, failure-rate,
// and win-pacing distributions against the product-spec ACs. Each tuned
// constant below is annotated with what it does and why this value, so it
// remains a documented lever for any future re-tuning pass rather than a
// magic number. A few values were deliberately left unchanged from their
// original placeholder where simulation showed the placeholder already
// satisfied its target — those are marked "kept" rather than "TUNED".

/** Valuation = annualizedMRR * REVENUE_MULTIPLE. Spec suggests an 8-12x band.
 * TE-9: kept at 12x (top of the suggested band) because MRR growth itself is
 * intentionally slow/compounding (v1 has no product/marketing sub-systems),
 * so a higher multiple is needed to make the $1M threshold reachable in the
 * ~15-25 week window under strong play without making early-game valuation
 * swings feel disconnected from weekly actions (verified via tuningSim.ts). */
export const REVENUE_MULTIPLE = 12; // TUNED (TE-9) — was 10 placeholder

/**
 * If a prior fundraising offer was accepted, valuation is re-anchored to
 * max(baseValuation, lastOffer.impliedValuation * GROWTH_DECAY_OR_CARRY_FACTOR).
 */
export const GROWTH_DECAY_OR_CARRY_FACTOR = 1.0; // PLACEHOLDER — tune in TE-9

/** Flat per-customer monthly price used for revenue = customerCount * price.
 * TE-9: raised from 50 -> 60 alongside the growth-rate tuning below so that
 * a "strong" playthrough's customer base (reaching roughly 130-180 customers
 * by week ~20) produces MRR that clears the $1M valuation threshold in the
 * targeted 15-25 week window at REVENUE_MULTIPLE=12. */
export const BASE_PRICE_PER_CUSTOMER = 60; // TUNED (TE-9) — was 50 placeholder

/** Weekly fixed operating expense, independent of team size.
 * TE-9: raised 2,000 -> 3,400, together with the salary constant below
 * (baseline burn ~$5,200/wk vs $100k starting cash, ~19wk runway before
 * revenue ramps up). The original placeholders (2,000/1,500, ~$3,500/wk burn)
 * left passive play too safe — under 20% of simulated runs hit bankruptcy or
 * sub-4-week runway by week 25, well short of the >=40% "stakes are real"
 * target — because rising customer revenue (from the growth-rate tuning
 * below) outpaced that lower burn even under neglectful play. This raises
 * the bar revenue has to clear (verified via tuningSim.ts: ~43.5% failure by
 * week 25 at these values). */
export const FIXED_WEEKLY_EXPENSE = 3_400; // TUNED (TE-9) — was 2,000 placeholder

/** Weekly salary cost per team member (teamSize is static/display in v1).
 * TE-9: raised 1,500 -> 1,800 alongside FIXED_WEEKLY_EXPENSE above — see that
 * constant's comment for the combined burn/runway rationale. */
export const SALARY_PER_TEAM_MEMBER_WEEKLY = 1_800; // TUNED (TE-9) — was 1,500 placeholder

/** Baseline weekly customer growth rate, before founder/industry modifiers.
 * TE-9: raised 0.05 -> 0.12. At 0.05 (placeholder) the compounding term was
 * negligible for the first ~15 weeks (customerCount starts at 0), so almost
 * all early growth came from the flat per-week trickle alone and valuation
 * never got close to $1M inside a reasonable session (simulated: median
 * weeks-to-success > 40). 0.12 makes the quality-driven compounding term
 * actually matter well before week 20, which is also what makes technical
 * debt (via the quality proxy) perceptibly connected to growth (Risk #3). */
export const BASE_CUSTOMER_GROWTH_RATE = 0.12; // TUNED (TE-9) — was 0.05 placeholder

/** Baseline weekly customer churn rate, before founder/industry modifiers.
 * TE-9: raised 0.02 -> 0.03 in proportion with the growth-rate increase above
 * so churn remains a meaningful counterweight (not trivially dominated by
 * growth) and high-debt quality loss still visibly bites into net growth. */
export const BASE_CUSTOMER_CHURN_RATE = 0.03; // TUNED (TE-9) — was 0.02 placeholder

/** Baseline weekly technical-debt drift (added before founder mult applies).
 * TE-9: kept at 1.5/week. Combined with the EV-3 event-probability curve,
 * this makes debt climb from the starting 10 to the 30s-40s over a 20-week
 * passive playthrough (visibly dragging growth down via the quality proxy),
 * while a "pay down debt" playstyle can hold debt in the teens/20s. */
export const TECHNICAL_DEBT_DRIFT_RATE = 1.5; // kept — verified via tuningSim.ts

/** Phase 2 (Team Management): each point of employee SKILL reduces the weekly
 * technical-debt drift by this much (team can halt drift, never reverse it —
 * active paydown is Product Management's job). With no employees (skill 0) this
 * is a no-op, so the tuned baseline economy is preserved for a player who never
 * hires; hiring trades salary burn for debt control + faster features.
 * PLACEHOLDER — not yet through a formal balance pass. */
export const TEAM_DEBT_REDUCTION_PER_SKILL = 0.5;

/** Phase 2 (Team Management): the founder's own weekly draw. Set equal to the
 * legacy per-head salary so a solo founder's burn is byte-identical to the
 * tuned baseline (financialEngine now sums the founder + each employee salary
 * instead of teamSize * flat salary). */
export const FOUNDER_WEEKLY_SALARY = SALARY_PER_TEAM_MEMBER_WEEKLY;

/** Phase 2 (Product Management): customer growth is multiplied by
 * 1 + QUALITY_GROWTH_SENSITIVITY * (productQuality - 50) / 50. Neutral (×1) at
 * the starting quality of 50, so the tuned baseline holds; building quality
 * above 50 accelerates growth, letting it fall below 50 penalizes.
 * PLACEHOLDER tuning lever. */
export const QUALITY_GROWTH_SENSITIVITY = 0.5;

/** Phase 2 (Product Management): starting product quality (0-100, neutral). */
export const PRODUCT_QUALITY_START = 50;

/** Minimum MRR required before a Seed round offer becomes available.
 * TE-9: kept at $5,000 — with BASE_PRICE_PER_CUSTOMER=60 this is reachable
 * around ~85 customers, comfortably mid-game, matching the spec's own
 * suggested example threshold. */
export const SEED_MRR_THRESHOLD = 5_000; // kept — verified via tuningSim.ts

/** Phase 2 — later-round MRR gates. Series A/B require progressively more
 * traction than Seed. PLACEHOLDER — not yet through a balance pass. */
export const SERIES_A_MRR_THRESHOLD = 20_000;
export const SERIES_B_MRR_THRESHOLD = 50_000;

/** Phase 2 — endgame exits. An acquisition offer becomes available once the
 * company is valued at/above this, and pays a premium on the current valuation.
 * Below the $1M "Success" line so taking it is a real "exit now vs. hold out"
 * choice. PLACEHOLDER levers. */
export const ACQUISITION_MIN_VALUATION = 400_000;
export const ACQUISITION_PREMIUM = 1.2;

/** Valuation at which the primary win unlocks. Phase 4: this is now the IPO
 * exit threshold (a one-click win) rather than an automatic end — reaching it is
 * unchanged (the economy is untouched), only what happens there changed. */
export const SUCCESS_VALUATION_THRESHOLD = 1_000_000; // per spec, not a tuning knob
export const IPO_VALUATION_THRESHOLD = SUCCESS_VALUATION_THRESHOLD;

/** Phase 4 — the ultimate automatic win: a $1B "Unicorn" valuation, reachable
 * only by choosing to keep building past the IPO line. */
export const UNICORN_VALUATION_THRESHOLD = 1_000_000_000;

/** Runway (weeks) below which the dashboard shows a low-runway warning. */
export const LOW_RUNWAY_WARNING_WEEKS = 4; // per spec, not a tuning knob

/** Baseline weekly Engineering-event probability, before technicalDebt
 * weighting. NOTE: this constant is not currently consumed anywhere — the
 * actual EV-3-tuned probability curve (base + per-debt-point slope, clamped)
 * lives directly in `engineeringEvent.ts`'s `eventFireProbability()`, which
 * is where the real EV-3 tuning happened (see that file's comment for the
 * final values/rationale). Left here at a directionally-consistent value
 * (matches that curve's base) rather than removed, since removing an
 * exported constant would be a structural change outside this tuning pass's
 * scope. */
export const BASE_EVENT_PROBABILITY = 0.28; // see engineeringEvent.ts for the real lever
