// TE-1 — Financial Engine: revenue, expenses, burn, cash, MRR.
//
// Pure function operating on the current metrics snapshot, per
// architecture.md Section 4: "revenue = customers × price, expenses = fixed +
// salary, burn = expenses - revenue."
//
// Phase 2 (Team Management): payroll is now the founder's draw plus each
// employee's individual salary (passed in), instead of teamSize × a flat rate.
// With no employees this equals FOUNDER_WEEKLY_SALARY, which is set equal to the
// old per-head rate — so a solo founder's burn is byte-identical to the tuned
// baseline.

import { FIXED_WEEKLY_EXPENSE } from "./constants";
import type { GameMetrics } from "./types";

/** Result of one week's financial calc, before growth/churn/debt/valuation run. */
export interface FinancialStepResult {
  cash: number;
  mrr: number;
  burnRate: number;
}

/**
 * Phase 3 — Customer Segments. Blended per-customer economics the caller
 * (advanceWeek) derives from the segment mix. At an all-SMB mix these are
 * `{ pricePerCustomer: BASE_PRICE_PER_CUSTOMER, supportPerCustomer: 0,
 * expansion: 0 }`, reproducing the tuned single-price economy exactly.
 */
export interface SegmentEconomics {
  pricePerCustomer: number;
  supportPerCustomer: number;
  expansion: number; // accrued expansion-revenue multiplier (0..cap)
}

/**
 * Applies one week of revenue/expense/burn/cash/MRR movement.
 * `payroll` is the total weekly wage bill (founder + employees). `seg` carries
 * blended per-customer price/support/expansion from the segment mix.
 */
export function applyFinancialEngine(
  metrics: GameMetrics,
  payroll: number,
  seg: SegmentEconomics,
): FinancialStepResult {
  const revenue = metrics.customerCount * seg.pricePerCustomer * (1 + seg.expansion);
  const supportCost = metrics.customerCount * seg.supportPerCustomer;
  const expenses = FIXED_WEEKLY_EXPENSE + payroll + supportCost;
  const burnRate = expenses - revenue;
  const cash = metrics.cash - burnRate;
  const mrr = revenue; // MRR in v1 is just the current week's revenue rate.

  return { cash, mrr, burnRate };
}
