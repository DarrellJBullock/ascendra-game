// Ascendra core game data model — DM-1.
//
// Mirrors company-docs/architecture.md Section 3 EXACTLY. This is the single
// source of truth for the client-resident game state that gets persisted to
// localStorage under key `ascendra:save:v1` (see storage.ts / store.ts).
//
// Phase-2 seams (deliberately left as extensible unions, not over-generalized):
//   - `EventTrigger` has one member today ("engineering"); Phase 2/3 add
//     Investor/People/Customer/Market as additional union members.
//   - `FundraisingRoundType` has three members today; Phase 2 adds
//     "FriendsAndFamily" | "SeriesA" | "SeriesB".
//   - `Industry` is already threaded through Company/context-building, even
//     though v1's financial math doesn't consult it yet (architecture.md Section 4).

export type Industry = "AI" | "Fintech" | "Ecommerce";

export type FounderType =
  | "Engineer"
  | "ProductManager"
  | "SalesLeader"
  | "MarketingExpert"
  | "FinanceExecutive";

/**
 * Applied once at company creation, read (never mutated) by the turn engine
 * every week. Each founder type should have >=2 nonzero (non-1.0/non-0) entries.
 */
export interface FounderModifiers {
  featureDevSpeedMult: number; // e.g. 1.15 = +15%
  technicalDebtAccrualMult: number; // e.g. 0.85 = -15%
  customerAcquisitionMult: number;
  fundraisingValuationMult: number;
  engineeringCostMult: number;
}

export interface Company {
  name: string;
  industry: Industry;
  founderType: FounderType;
  founderModifiers: FounderModifiers;
  foundedAtWeek: 0;
}

/**
 * Current-state metrics the dashboard reads directly and the turn engine
 * reads+writes weekly.
 */
export interface GameMetrics {
  week: number; // current week number, starts at 1
  cash: number;
  mrr: number;
  burnRate: number; // weekly net burn
  runwayWeeks: number; // derived: cash / burnRate (or Infinity if burnRate<=0)
  customerCount: number;
  teamSize: number; // static/display-only in v1, not a live-managed lever
  technicalDebt: number; // 0-100 scale (or similar), drives event probability/severity
  valuation: number; // recomputed every week per formula in Section 4
  founderOwnershipPct: number; // starts at 100, decreases on accepted fundraising offers
}

/**
 * One record appended per completed week; feeds the dashboard's 12-week trend
 * chart and is the audit trail / debuggability surface for determinism ACs.
 */
export interface TurnHistoryRecord {
  week: number;
  metricsSnapshot: GameMetrics; // full state at end of that week
  eventId?: string; // reference into eventLog, if an event fired this week
  fundraisingOfferId?: string; // reference into fundraisingOffers, if raised this week
}

/** Only category in v1; union grows in Phase 2/3 (see file header). */
export type EventTrigger = "engineering";

export type SeverityBand = "low" | "moderate" | "high";

export interface EventChoice {
  id: string;
  label: string;
  description: string; // the tradeoff text shown to the player
  consequences: {
    cashDelta?: number;
    technicalDebtDelta?: number;
    customerCountDelta?: number;
  };
}

export interface EventLogRecord {
  id: string;
  week: number;
  trigger: EventTrigger;
  narrative: string; // AI-generated or fallback-template text
  source: "ai" | "fallback"; // which path produced this event, for QA/telemetry
  choices: EventChoice[]; // exactly 2 or 3
  chosenChoiceId: string | null; // null until player picks
}

/** Bootstrap/Angel/Seed in v1; union grows in Phase 2 (see file header). */
export type FundraisingRoundType = "Bootstrap" | "Angel" | "Seed";

export interface FundraisingOffer {
  id: string;
  week: number;
  roundType: FundraisingRoundType;
  offeredCash: number;
  impliedValuation: number;
  equityPct: number;
  status: "pending" | "accepted" | "declined";
}

/** Phase 2 — Product Management. The player's weekly product "focus": grow the
 * product (ship), pay down debt (refactor), or cheaply maintain (fix bugs).
 * Union so more actions can be added later without a shape change. */
export type ProductActionType = "ship_feature" | "refactor" | "fix_bugs";

/** One product action taken in a given week (at most one per week). Records the
 * applied deltas so the UI can show "this week you…" without recomputing. */
export interface ProductActionRecord {
  id: string;
  week: number;
  action: ProductActionType;
  cashDelta: number;
  technicalDebtDelta: number;
  customerCountDelta: number;
}

/**
 * The output of the ONE stochastic step (EV-1's `rollEngineeringEvent`)
 * before narrative/choices exist for it. `advanceWeek` (TE-7) sets this when
 * an event fires; the UI layer (FE-2/FE-14, not this module's concern) is
 * responsible for fetching/generating the narrative+choices (AI or
 * fallback) and then calling `applyEventChoice` (EV-2), which clears this
 * field back to `null` once the player has picked a choice. While this is
 * non-null, "Advance Week" should be blocked by the UI (an unresolved event
 * must be resolved before the next week can proceed) — see advanceWeek.ts
 * for the full pipeline-boundary writeup.
 */
export interface PendingEngineeringEvent {
  week: number;
  trigger: EventTrigger;
  severity: SeverityBand;
}

/** The single root object persisted to localStorage. */
export interface GameState {
  schemaVersion: 1; // bump on any breaking shape change; enables migration logic later
  company: Company;
  metrics: GameMetrics;
  turnHistory: TurnHistoryRecord[]; // capped/pruned display-side to last 12 for the chart, but
  // full log kept for the session (small, session-only data)
  eventLog: EventLogRecord[];
  fundraisingOffers: FundraisingOffer[];
  /**
   * Phase 2 — Product Management. Append-only log of product actions (at most
   * one per week). Optional so persisted saves from before this feature still
   * deserialize; read sites default to `[]` (see product.ts / factory.ts).
   */
  productActions?: ProductActionRecord[];
  gameStatus: "in_progress" | "bankrupt" | "success";
  /**
   * Non-null between "an Engineering event rolled this week" and "the player
   * has chosen a resolution for it." Additive field (Epic B/C, TE-7) — see
   * `PendingEngineeringEvent` doc comment for the full advanceWeek boundary.
   * `null` when there is nothing pending (the normal case).
   */
  pendingEngineeringEvent: PendingEngineeringEvent | null;
  /**
   * Additive field (FE-3/FE-12): a per-game-session RNG seed generated once
   * at company creation, used to derive per-week seeds for `advanceWeek`'s
   * event roll (see rng.ts's `deriveWeekSeed`) so a whole playthrough is
   * deterministic/replayable from this one root value. Optional so existing
   * persisted saves without it (pre-this-change) still deserialize fine;
   * callers should generate one on the fly if absent (see factory.ts).
   */
  sessionSeed?: number;
}
