import { describe, expect, it } from "vitest";

import { createNewGameState, STARTING_CASH } from "@/src/game/factory";
import { FIXED_WEEKLY_EXPENSE } from "@/src/game/constants";
import { FOUNDER_WEEKLY_SALARY } from "@/src/game/constants";
import { balanceSheet, cashFlow, incomeStatement } from "@/src/game/financials";
import type { GameState } from "@/src/game/types";

function state(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

describe("financial statements (Phase 3)", () => {
  it("income statement decomposes into gross profit and operating income", () => {
    // all-SMB (support 0), solo founder (payroll = founder salary), known MRR.
    const s = state({ mrr: 12_000, customerCount: 200 });
    const inc = incomeStatement(s);
    expect(inc.revenue).toBe(12_000);
    expect(inc.supportCost).toBe(0); // all-SMB
    expect(inc.grossProfit).toBe(inc.revenue - inc.supportCost);
    expect(inc.payroll).toBe(FOUNDER_WEEKLY_SALARY);
    expect(inc.fixedExpense).toBe(FIXED_WEEKLY_EXPENSE);
    expect(inc.operatingIncome).toBe(inc.grossProfit - inc.payroll - inc.fixedExpense);
    expect(inc.netIncome).toBe(inc.operatingIncome);
  });

  it("operating income equals -burnRate for a consistent state", () => {
    const mrr = 9_000;
    const burnRate = FIXED_WEEKLY_EXPENSE + FOUNDER_WEEKLY_SALARY - mrr; // engine identity, all-SMB solo
    const s = state({ mrr, burnRate, customerCount: 150 });
    expect(incomeStatement(s).operatingIncome).toBe(-burnRate);
  });

  it("cash flow reconciles to ending cash by construction", () => {
    const s = state({ cash: 42_000 });
    const cf = cashFlow(s);
    expect(cf.beginningCash).toBe(STARTING_CASH);
    expect(cf.endingCash).toBe(42_000);
    expect(
      cf.beginningCash + cf.operating + cf.investments + cf.eventOutcomes + cf.financing,
    ).toBeCloseTo(cf.endingCash, 6);
  });

  it("balance sheet balances and splits equity by the cap table", () => {
    const s = state({ cash: 80_000, founderOwnershipPct: 75 });
    const bs = balanceSheet(s);
    expect(bs.equity).toBe(bs.cash - bs.liabilities);
    expect(bs.founderEquity + bs.investorEquity).toBeCloseTo(bs.equity, 6);
    expect(bs.founderEquity).toBeCloseTo(80_000 * 0.75, 6);
  });
});
