// Phase 3 — Financial statements (pure, derived — no engine change).
//
// Reconstructs three standard statements from state the game already tracks.
// Nothing here feeds back into the simulation; it's a reporting layer for the
// "command center" fantasy. Key property: the weekly income statement is a
// faithful decomposition of the engine's own burn — operating income tracks
// -burnRate (exactly when revenue and customer count are in sync; the engine
// posts MRR from the start-of-week count, so after a growth step they differ by
// one week of new customers). Revenue is `metrics.mrr` so it matches the
// dashboard's MRR tile.

import { FIXED_WEEKLY_EXPENSE } from "./constants";
import { STARTING_CASH } from "./factory";
import { DEFAULT_SEGMENT_MIX, blendedSupport } from "./segments";
import { teamPayroll } from "./team";
import type { GameState } from "./types";

export interface IncomeStatement {
  revenue: number;
  supportCost: number;
  grossProfit: number;
  payroll: number;
  fixedExpense: number;
  operatingIncome: number; // tracks -burnRate (see file header)
  netIncome: number;
}

/** Weekly run-rate P&L. operatingIncome = revenue - support - payroll - fixed,
 * i.e. -(fixed + payroll + support - revenue) = -burnRate when revenue/count are
 * in sync (see file header). */
export function incomeStatement(state: GameState): IncomeStatement {
  const m = state.metrics;
  const mix = m.segmentMix ?? DEFAULT_SEGMENT_MIX;
  const revenue = m.mrr;
  const supportCost = m.customerCount * blendedSupport(mix);
  const grossProfit = revenue - supportCost;
  const payroll = teamPayroll(state);
  const fixedExpense = FIXED_WEEKLY_EXPENSE;
  const operatingIncome = grossProfit - payroll - fixedExpense;
  return {
    revenue,
    supportCost,
    grossProfit,
    payroll,
    fixedExpense,
    operatingIncome,
    netIncome: operatingIncome,
  };
}

export interface CashFlow {
  beginningCash: number;
  operating: number; // recurring burn/profit accumulated (residual)
  investments: number; // Product + Team + Marketing discretionary spend (<= 0)
  eventOutcomes: number; // net cash from resolved event choices
  financing: number; // capital raised
  endingCash: number;
}

/** Cumulative cash flow for the run, reconciled to ending cash by construction
 * (the operating line absorbs the recurring weekly burn). */
export function cashFlow(state: GameState): CashFlow {
  const endingCash = state.metrics.cash;
  const financing = (state.fundraisingOffers ?? [])
    .filter((o) => o.status === "accepted")
    .reduce((s, o) => s + o.offeredCash, 0);
  const investments =
    (state.productActions ?? []).reduce((s, a) => s + a.cashDelta, 0) +
    (state.teamActions ?? []).reduce((s, a) => s + a.cashDelta, 0) +
    (state.marketingActions ?? []).reduce((s, a) => s + a.cashDelta, 0);
  const eventOutcomes = state.eventLog.reduce((s, e) => {
    if (!e.chosenChoiceId) return s;
    const chosen = e.choices.find((c) => c.id === e.chosenChoiceId);
    return s + (chosen?.consequences.cashDelta ?? 0);
  }, 0);
  const operating =
    endingCash - STARTING_CASH - financing - investments - eventOutcomes;
  return { beginningCash: STARTING_CASH, operating, investments, eventOutcomes, financing, endingCash };
}

export interface BalanceSheet {
  cash: number;
  liabilities: number;
  equity: number;
  founderEquity: number;
  investorEquity: number;
  impliedValuation: number; // memo — market value, not book
}

/** Simple book balance sheet: the only asset is cash, no liabilities in v1, so
 * equity = cash, split by the current cap table. Valuation shown as a memo. */
export function balanceSheet(state: GameState): BalanceSheet {
  const cash = state.metrics.cash;
  const founderPct = state.metrics.founderOwnershipPct / 100;
  return {
    cash,
    liabilities: 0,
    equity: cash,
    founderEquity: cash * founderPct,
    investorEquity: cash * (1 - founderPct),
    impliedValuation: state.metrics.valuation,
  };
}
