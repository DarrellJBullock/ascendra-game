import { describe, expect, it } from "vitest";
import { createNewGameState } from "../factory";
import type { GameState } from "../types";

describe("GameState serialization (DM-1)", () => {
  it("roundtrips through JSON with no loss", () => {
    const state = createNewGameState({
      name: "Acme AI",
      industry: "AI",
      founderType: "Engineer",
    });

    const roundTripped = JSON.parse(JSON.stringify(state)) as GameState;

    expect(roundTripped).toEqual(state);
    expect(roundTripped.schemaVersion).toBe(1);
    expect(roundTripped.company.founderModifiers).toEqual(
      state.company.founderModifiers,
    );
  });

  it("preserves nested arrays (turnHistory/eventLog/fundraisingOffers) through JSON", () => {
    const state = createNewGameState({
      name: "Test Co",
      industry: "Fintech",
      founderType: "FinanceExecutive",
    });

    state.turnHistory.push({
      week: 1,
      metricsSnapshot: { ...state.metrics },
      eventId: "evt-1",
    });
    state.eventLog.push({
      id: "evt-1",
      week: 1,
      trigger: "engineering",
      narrative: "Something broke.",
      source: "fallback",
      choices: [
        {
          id: "c1",
          label: "Fix it",
          description: "Costs cash, reduces debt.",
          consequences: { cashDelta: -100, technicalDebtDelta: -5 },
        },
      ],
      chosenChoiceId: null,
    });
    state.fundraisingOffers.push({
      id: "off-1",
      week: 1,
      roundType: "Angel",
      offeredCash: 50000,
      impliedValuation: 500000,
      equityPct: 10,
      status: "pending",
    });

    const roundTripped = JSON.parse(JSON.stringify(state)) as GameState;
    expect(roundTripped).toEqual(state);
  });
});
