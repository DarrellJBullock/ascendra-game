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

import { BASE_PRICE_PER_CUSTOMER, FIXED_WEEKLY_EXPENSE } from "./constants";
import type { GameMetrics } from "./types";

/** Result of one week's financial calc, before growth/churn/debt/valuation run. */
export interface FinancialStepResult {
  cash: number;
  mrr: number;
  burnRate: number;
}

/**
 * Applies one week of revenue/expense/burn/cash/MRR movement.
 * `payroll` is the total weekly wage bill (founder + employees), computed by the
 * caller (advanceWeek) from the employee roster.
 */
export function applyFinancialEngine(
  metrics: GameMetrics,
  payroll: number,
): FinancialStepResult {
  // BASE_PRICE_PER_CUSTOMER is a flat v1 pricing constant (tuning lever, TE-9).
  const revenue = metrics.customerCount * BASE_PRICE_PER_CUSTOMER;
  const expenses = FIXED_WEEKLY_EXPENSE + payroll;
  const burnRate = expenses - revenue;
  const cash = metrics.cash - burnRate;
  const mrr = revenue; // MRR in v1 is just the current week's revenue rate.

  return { cash, mrr, burnRate };
}
