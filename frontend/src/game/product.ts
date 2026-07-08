// Phase 2 — Product Management (pure logic), deeper version.
//
// The weekly product focus is now one of: ship a feature (a named release —
// grows customers, raises product quality + innovation, adds some debt),
// refactor (heavy debt paydown + quality), or fix bugs (cheap debt paydown +
// quality). Product quality drives customer growth (see customerGrowth.ts);
// innovation is a cumulative count of features shipped. At most ONE product
// action per week.
//
// Effects apply immediately to cash / technicalDebt / customerCount /
// productQuality / innovation. Revenue re-derives from customerCount each week
// (engine is the source of truth), so a feature's customer bump flows into MRR
// on the next Advance Week.
//
// DEFERRED within Product (future): a multi-week feature BUILD queue (features
// ship instantly here) and an explicit named-bug backlog (bugs stay modeled via
// technical debt). PLACEHOLDER economics — documented tuning levers.

import type { GameMetrics, GameState, ProductActionRecord, ProductActionType } from "./types";

export type FeatureSize = "small" | "major";

export interface FeatureDef {
  size: FeatureSize;
  label: string;
  cost: number;
  flatCustomers: number;
  pctCustomers: number; // fraction of current base added on top
  qualityGain: number;
  debtAdded: number;
}

export const FEATURES: Record<FeatureSize, FeatureDef> = {
  small: { size: "small", label: "Small feature", cost: 6_000, flatCustomers: 5, pctCustomers: 0.06, qualityGain: 5, debtAdded: 4 },
  major: { size: "major", label: "Major feature", cost: 14_000, flatCustomers: 12, pctCustomers: 0.1, qualityGain: 10, debtAdded: 9 },
};

export const REFACTOR = { cost: 14_000, debtRemoved: 18, qualityGain: 5 };
export const FIX_BUGS = { cost: 4_000, debtRemoved: 7, qualityGain: 3 };

const FEATURE_NAMES = [
  "Realtime dashboard", "SSO integration", "Mobile app", "Bulk export",
  "Audit log", "API v2", "Smart alerts", "Team workspaces", "Usage analytics",
  "Dark mode", "Webhooks", "Advanced search", "Custom reports", "Onboarding flow",
];

function randomFeatureName(): string {
  return FEATURE_NAMES[Math.floor(Math.random() * FEATURE_NAMES.length)];
}

const clampDebt = (v: number) => Math.max(0, Math.min(100, v));
const clampQuality = (v: number) => Math.max(0, Math.min(100, v));

/** True if no product action has been taken yet this week and the game is live. */
export function canTakeProductActionThisWeek(state: GameState): boolean {
  if (state.gameStatus !== "in_progress") return false;
  const actions = state.productActions ?? [];
  return !actions.some((a) => a.week === state.metrics.week);
}

function apply(
  state: GameState,
  action: ProductActionType,
  next: Partial<Pick<GameMetrics, "cash" | "technicalDebt" | "customerCount" | "productQuality" | "innovation">>,
  extra: { featureName?: string } = {},
): GameState {
  const m = state.metrics;
  const merged = { ...m, ...next };
  const record: ProductActionRecord = {
    id: `prod-${m.week}-${action}-${Math.random().toString(36).slice(2, 8)}`,
    week: m.week,
    action,
    cashDelta: merged.cash - m.cash,
    technicalDebtDelta: merged.technicalDebt - m.technicalDebt,
    customerCountDelta: merged.customerCount - m.customerCount,
    qualityDelta: merged.productQuality - m.productQuality,
    featureName: extra.featureName,
  };
  return {
    ...state,
    metrics: merged,
    productActions: [...(state.productActions ?? []), record],
  };
}

export function canAffordFeature(state: GameState, size: FeatureSize): boolean {
  return state.metrics.cash >= FEATURES[size].cost;
}
export function canAffordRefactor(state: GameState): boolean {
  return state.metrics.cash >= REFACTOR.cost;
}
export function canAffordFix(state: GameState): boolean {
  return state.metrics.cash >= FIX_BUGS.cost;
}

/** Ship a named feature: grows customers + quality + innovation, adds debt. */
export function shipFeature(state: GameState, size: FeatureSize): GameState {
  if (!canTakeProductActionThisWeek(state) || !canAffordFeature(state, size)) return state;
  const f = FEATURES[size];
  const m = state.metrics;
  const customerGain = f.flatCustomers + Math.round(m.customerCount * f.pctCustomers);
  return apply(
    state,
    "ship_feature",
    {
      cash: m.cash - f.cost,
      customerCount: Math.max(0, m.customerCount + customerGain),
      technicalDebt: clampDebt(m.technicalDebt + f.debtAdded),
      productQuality: clampQuality(m.productQuality + f.qualityGain),
      innovation: m.innovation + 1,
    },
    { featureName: randomFeatureName() },
  );
}

export function refactorProduct(state: GameState): GameState {
  if (!canTakeProductActionThisWeek(state) || !canAffordRefactor(state)) return state;
  const m = state.metrics;
  return apply(state, "refactor", {
    cash: m.cash - REFACTOR.cost,
    technicalDebt: clampDebt(m.technicalDebt - REFACTOR.debtRemoved),
    productQuality: clampQuality(m.productQuality + REFACTOR.qualityGain),
  });
}

export function fixBugs(state: GameState): GameState {
  if (!canTakeProductActionThisWeek(state) || !canAffordFix(state)) return state;
  const m = state.metrics;
  return apply(state, "fix_bugs", {
    cash: m.cash - FIX_BUGS.cost,
    technicalDebt: clampDebt(m.technicalDebt - FIX_BUGS.debtRemoved),
    productQuality: clampQuality(m.productQuality + FIX_BUGS.qualityGain),
  });
}
