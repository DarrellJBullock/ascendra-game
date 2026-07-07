// Phase 2 — Product Management (pure logic).
//
// Gives the player direct control over the product each week: grow it (ship a
// feature), pay down technical debt (refactor / fix bugs), rather than only
// reacting to debt via Engineering events. At most ONE product focus per week,
// mirroring the once-per-week fundraising cadence, so it's a real weekly
// decision alongside "Advance Week" and "Fundraise".
//
// Effects are applied immediately to cash / technicalDebt / customerCount (the
// same levers the turn engine and events already use — no new stat types). MRR
// and valuation are NOT touched here: the financial engine re-derives MRR from
// customerCount each week, so a customer bump flows through on the next
// Advance Week (keeping the engine the single source of truth for revenue).
//
// PLACEHOLDER economics: costs/effects below are sized as real runway decisions
// against the tuned economy ($100k start, ~$5.2k/wk burn, debt on a 0-100
// scale) but have NOT been through a formal balance pass — they're a documented
// lever for a future tuning pass, like constants.ts.

import type {
  GameMetrics,
  GameState,
  ProductActionRecord,
  ProductActionType,
} from "./types";

export interface ProductActionDef {
  type: ProductActionType;
  label: string;
  tagline: string;
  /** Cash cost (spent immediately). */
  cost: number;
  /** Short "what it does" line for the UI. */
  effectSummary: string;
}

// --- PLACEHOLDER tuning values (see file header) -----------------------------
const SHIP_FEATURE_COST = 9_000;
const SHIP_FEATURE_FLAT_CUSTOMERS = 5; // base gain, meaningful from customerCount=0
const SHIP_FEATURE_PCT_CUSTOMERS = 0.08; // + a fraction of the current base
const SHIP_FEATURE_DEBT_ADDED = 5; // shipping fast adds debt

const REFACTOR_COST = 14_000;
const REFACTOR_DEBT_REMOVED = 18; // heavy, expensive debt paydown

const FIX_BUGS_COST = 4_000;
const FIX_BUGS_DEBT_REMOVED = 7; // cheap, smaller debt paydown
// -----------------------------------------------------------------------------

export const PRODUCT_ACTIONS: ProductActionDef[] = [
  {
    type: "ship_feature",
    label: "Ship a feature",
    tagline: "Grow the product",
    cost: SHIP_FEATURE_COST,
    effectSummary: `+${SHIP_FEATURE_FLAT_CUSTOMERS}+ customers · +${SHIP_FEATURE_DEBT_ADDED} debt`,
  },
  {
    type: "refactor",
    label: "Refactor",
    tagline: "Invest in the codebase",
    cost: REFACTOR_COST,
    effectSummary: `−${REFACTOR_DEBT_REMOVED} technical debt`,
  },
  {
    type: "fix_bugs",
    label: "Fix bugs",
    tagline: "Cheap maintenance",
    cost: FIX_BUGS_COST,
    effectSummary: `−${FIX_BUGS_DEBT_REMOVED} technical debt`,
  },
];

export function getProductAction(type: ProductActionType): ProductActionDef {
  const def = PRODUCT_ACTIONS.find((a) => a.type === type);
  if (!def) throw new Error(`Unknown product action: ${type}`);
  return def;
}

/** Raw deltas an action applies, given the current metrics (some scale with
 * the current customer base). Pure — no clamping here (see applyProductAction). */
function computeDeltas(
  type: ProductActionType,
  metrics: GameMetrics,
): { cashDelta: number; technicalDebtDelta: number; customerCountDelta: number } {
  switch (type) {
    case "ship_feature":
      return {
        cashDelta: -SHIP_FEATURE_COST,
        technicalDebtDelta: SHIP_FEATURE_DEBT_ADDED,
        customerCountDelta:
          SHIP_FEATURE_FLAT_CUSTOMERS +
          Math.round(metrics.customerCount * SHIP_FEATURE_PCT_CUSTOMERS),
      };
    case "refactor":
      return { cashDelta: -REFACTOR_COST, technicalDebtDelta: -REFACTOR_DEBT_REMOVED, customerCountDelta: 0 };
    case "fix_bugs":
      return { cashDelta: -FIX_BUGS_COST, technicalDebtDelta: -FIX_BUGS_DEBT_REMOVED, customerCountDelta: 0 };
  }
}

/** True if no product action has been taken yet this week and the game is live. */
export function canTakeProductActionThisWeek(state: GameState): boolean {
  if (state.gameStatus !== "in_progress") return false;
  const actions = state.productActions ?? [];
  return !actions.some((a) => a.week === state.metrics.week);
}

/** True if the player can afford the given action right now. */
export function canAffordProductAction(state: GameState, type: ProductActionType): boolean {
  return state.metrics.cash >= getProductAction(type).cost;
}

/**
 * Apply a product action: spend the cash, adjust technical debt (clamped 0-100)
 * and customer count (clamped >= 0), and append the record. No-op (returns the
 * same state) if it can't be taken this week or can't be afforded — the UI
 * disables those cases, this is defense in depth.
 */
export function applyProductAction(state: GameState, type: ProductActionType): GameState {
  if (!canTakeProductActionThisWeek(state) || !canAffordProductAction(state, type)) {
    return state;
  }

  const deltas = computeDeltas(type, state.metrics);
  const technicalDebt = Math.max(
    0,
    Math.min(100, state.metrics.technicalDebt + deltas.technicalDebtDelta),
  );
  const customerCount = Math.max(0, state.metrics.customerCount + deltas.customerCountDelta);
  const cash = state.metrics.cash + deltas.cashDelta;

  const record: ProductActionRecord = {
    id: `prod-${state.metrics.week}-${type}-${Math.random().toString(36).slice(2, 8)}`,
    week: state.metrics.week,
    action: type,
    cashDelta: deltas.cashDelta,
    // record the *effective* debt change after clamping, so the UI note matches
    technicalDebtDelta: technicalDebt - state.metrics.technicalDebt,
    customerCountDelta: customerCount - state.metrics.customerCount,
  };

  return {
    ...state,
    metrics: { ...state.metrics, cash, technicalDebt, customerCount },
    productActions: [...(state.productActions ?? []), record],
  };
}
