// TE-1 — Financial Engine: revenue, expenses, burn, cash, MRR.
//
// Pure function operating on the current metrics snapshot, per
// architecture.md Section 4: "revenue = customers × price (fixed per
// industry or flat in v1), expenses = fixed + salary-per-teamSize,
// burn = expenses - revenue."

import {
  BASE_PRICE_PER_CUSTOMER,
  FIXED_WEEKLY_EXPENSE,
  SALARY_PER_TEAM_MEMBER_WEEKLY,
} from "./constants";
import type { GameMetrics } from "./types";

/** Result of one week's financial calc, before growth/churn/debt/valuation run. */
export interface FinancialStepResult {
  cash: number;
  mrr: number;
  burnRate: number;
}

/**
 * Applies one week of revenue/expense/burn/cash/MRR movement.
 * `customerCount`/`teamSize` are read as-of the START of the week (growth is
 * applied in a later pipeline step, TE-2, so this function does not mutate
 * customerCount itself).
 */
export function applyFinancialEngine(metrics: GameMetrics): FinancialStepResult {
  // BASE_PRICE_PER_CUSTOMER is a flat v1 pricing constant (tuning lever, TE-9).
  const revenue = metrics.customerCount * BASE_PRICE_PER_CUSTOMER;
  const expenses =
    FIXED_WEEKLY_EXPENSE + metrics.teamSize * SALARY_PER_TEAM_MEMBER_WEEKLY;
  const burnRate = expenses - revenue;
  const cash = metrics.cash - burnRate;
  const mrr = revenue; // MRR in v1 is just the current week's revenue rate.

  return { cash, mrr, burnRate };
}
