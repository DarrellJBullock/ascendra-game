import { describe, expect, it } from "vitest";
import { createNewGameState } from "../factory";
import { advanceWeek } from "../advanceWeek";
import { applyEventChoice, materializeFallbackEvent } from "../applyEventChoice";
import { computeValuation } from "../valuation";
import { checkEndStates } from "../endStates";
import { rollEngineeringEvent } from "../engineeringEvent";
import { selectFallbackEvent } from "../fallbackEvents";
import type { GameState } from "../types";

function freshState(): GameState {
  return createNewGameState({
    name: "Test Co",
    industry: "AI",
    founderType: "Engineer",
  });
}

describe("advanceWeek determinism (TE-7/TE-10)", () => {
  it("same state + seed produces identical output across runs", () => {
    const base = freshState();
    const out1 = advanceWeek(base, 42);
    const out2 = advanceWeek(base, 42);
    expect(out1).toEqual(out2);
  });

  it("running a seeded 20-week sim twice yields identical full histories", () => {
    function runTwentyWeeks(seed: number): GameState {
      let state = freshState();
      for (let i = 0; i < 20; i++) {
        if (state.gameStatus !== "in_progress") break;
        if (state.pendingEngineeringEvent) {
          // Resolve deterministically the same way each run: pick first choice.
          const template = selectFallbackEvent(
            state.pendingEngineeringEvent.trigger,
            state.company.industry,
            state.pendingEngineeringEvent.severity,
            () => 0,
          );
          const event = materializeFallbackEvent(
            template,
            state.pendingEngineeringEvent.week,
            state.pendingEngineeringEvent.trigger,
          );
          const withPendingLogged = { ...state, eventLog: [...state.eventLog, event] };
          state = applyEventChoice(withPendingLogged, event, event.choices[0].id);
        }
        state = advanceWeek(state, seed);
      }
      return state;
    }

    const runA = runTwentyWeeks(7);
    const runB = runTwentyWeeks(7);
    // Ids are timestamp/counter based on event materialization, so compare
    // everything except id fields for a true "identical simulation" check.
    const strip = (s: GameState) => ({
      metrics: s.metrics,
      gameStatus: s.gameStatus,
      turnHistoryMetrics: s.turnHistory.map((h) => h.metricsSnapshot),
    });
    expect(strip(runA)).toEqual(strip(runB));
  });
});

describe("end states (TE-6)", () => {
  it("triggers bankrupt when cash <= 0", () => {
    const state = freshState();
    state.metrics.cash = 0;
    expect(checkEndStates(state)).toBe("bankrupt");

    state.metrics.cash = -500;
    expect(checkEndStates(state)).toBe("bankrupt");
  });

  it("triggers success when valuation >= 1,000,000", () => {
    const state = freshState();
    state.metrics.cash = 100_000;
    state.metrics.valuation = 1_000_000;
    expect(checkEndStates(state)).toBe("success");
  });

  it("stays in_progress otherwise", () => {
    const state = freshState();
    expect(checkEndStates(state)).toBe("in_progress");
  });

  it("advanceWeek is a no-op once gameStatus is no longer in_progress", () => {
    const state = freshState();
    state.gameStatus = "bankrupt";
    const next = advanceWeek(state, 1);
    expect(next).toBe(state);
  });
});

describe("computeValuation (TE-4)", () => {
  it("uses annualized MRR x REVENUE_MULTIPLE when no prior offer", () => {
    const state = freshState();
    state.metrics.mrr = 1000;
    const valuation = computeValuation(state.metrics);
    expect(valuation).toBe(1000 * 12 * 12); // REVENUE_MULTIPLE tuned (TE-9) = 12
  });

  it("re-anchors to last accepted offer when higher than base valuation", () => {
    const state = freshState();
    state.metrics.mrr = 10; // tiny base valuation
    const offer = {
      id: "offer-1",
      week: 3,
      roundType: "Angel" as const,
      offeredCash: 200_000,
      impliedValuation: 2_000_000,
      equityPct: 10,
      status: "accepted" as const,
    };
    const valuation = computeValuation(state.metrics, offer);
    expect(valuation).toBeGreaterThanOrEqual(2_000_000);
  });
});

describe("rollEngineeringEvent (EV-1)", () => {
  it("is deterministic given the same technicalDebt + seed", () => {
    const a = rollEngineeringEvent(50, 123);
    const b = rollEngineeringEvent(50, 123);
    expect(a).toEqual(b);
  });

  it("20-week seeded simulated run fires between 4 and 10 engineering events", () => {
    let state = freshState();
    let eventCount = 0;
    for (let week = 0; week < 20; week++) {
      if (state.gameStatus !== "in_progress") break;
      if (state.pendingEngineeringEvent) {
        eventCount += 1;
        const template = selectFallbackEvent(
          state.pendingEngineeringEvent.trigger,
          state.company.industry,
          state.pendingEngineeringEvent.severity,
          () => 0,
        );
        const event = materializeFallbackEvent(
          template,
          state.pendingEngineeringEvent.week,
          state.pendingEngineeringEvent.trigger,
        );
        const withPendingLogged = { ...state, eventLog: [...state.eventLog, event] };
        state = applyEventChoice(withPendingLogged, event, event.choices[0].id);
      }
      state = advanceWeek(state, 555);
    }
    expect(eventCount).toBeGreaterThanOrEqual(4);
    expect(eventCount).toBeLessThanOrEqual(10);
  });

  it("high technical debt produces a measurably higher event rate than low debt", () => {
    function countFires(debt: number, seedBase: number): number {
      let fires = 0;
      for (let w = 0; w < 200; w++) {
        const roll = rollEngineeringEvent(debt, seedBase + w * 97 + 1);
        if (roll.fired) fires += 1;
      }
      return fires;
    }

    const lowDebtFires = countFires(5, 1000);
    const highDebtFires = countFires(90, 1000);
    expect(highDebtFires).toBeGreaterThan(lowDebtFires);
  });
});

describe("applyEventChoice (EV-2)", () => {
  it("applies chosen consequences to cash/technicalDebt/customerCount and logs the record", () => {
    const state = freshState();
    state.metrics.cash = 100_000;
    state.metrics.technicalDebt = 20;
    state.metrics.customerCount = 10;

    const template = selectFallbackEvent("engineering", "AI", "low", () => 0);
    const event = materializeFallbackEvent(template, 2, "engineering");
    const stateWithLoggedEvent = { ...state, eventLog: [...state.eventLog, event] };

    const chosen = event.choices[0];
    const next = applyEventChoice(stateWithLoggedEvent, event, chosen.id);

    const expectedCash =
      state.metrics.cash + (chosen.consequences.cashDelta ?? 0);
    const expectedDebt = Math.max(
      0,
      Math.min(100, state.metrics.technicalDebt + (chosen.consequences.technicalDebtDelta ?? 0)),
    );
    const expectedCustomers = Math.max(
      0,
      state.metrics.customerCount + (chosen.consequences.customerCountDelta ?? 0),
    );

    expect(next.metrics.cash).toBe(expectedCash);
    expect(next.metrics.technicalDebt).toBe(expectedDebt);
    expect(next.metrics.customerCount).toBe(expectedCustomers);

    const loggedEvent = next.eventLog.find((e) => e.id === event.id);
    expect(loggedEvent?.chosenChoiceId).toBe(chosen.id);
    expect(next.pendingEngineeringEvent).toBeNull();
  });

  it("throws for an unknown choiceId", () => {
    const state = freshState();
    const template = selectFallbackEvent("engineering", "AI", "low", () => 0);
    const event = materializeFallbackEvent(template, 2, "engineering");
    expect(() => applyEventChoice(state, event, "not-a-real-id")).toThrow();
  });
});

describe("performance sanity (TE-10)", () => {
  it("a single advanceWeek call completes in well under the 2s budget", () => {
    const state = freshState();
    const start = performance.now();
    advanceWeek(state, 1);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200); // generous margin under the 2000ms spec budget
  });
});
