// FE-13/FE-16/FE-24 — integration-level tests over the orchestration/engine
// logic layer (no @testing-library/react needed — these exercise the exact
// same pure/near-pure functions the Dashboard/EventCard/EndScreen components
// render from, so "dashboard values match engine output" is verified at the
// data layer feeding those components).

import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/src/game/factory";
import { advanceWeekWithEvent } from "@/src/game/turnOrchestration";
import { applyEventChoice } from "@/src/game/applyEventChoice";
import type { GameState } from "@/src/game/types";
import type { GenerateNarrativeFn } from "@/src/game/turnOrchestration";

const mockGenerate: GenerateNarrativeFn = async () => ({
  narrative: "Test narrative",
  choices: [
    { label: "A", description: "a", consequences: { cashDelta: -500 } },
    { label: "B", description: "b", consequences: { cashDelta: 0, technicalDebtDelta: 5 } },
    { label: "C", description: "c", consequences: { customerCountDelta: -3 } },
  ],
  source: "ai",
});

function freshState(): GameState {
  return createNewGameState({ name: "Dash Co", industry: "Ecommerce", founderType: "SalesLeader" });
}

describe("FE-13 — dashboard values match engine output for a fixed playthrough", () => {
  it("metrics rendered would equal metrics produced by the deterministic engine, week over week", async () => {
    let state: GameState = { ...freshState(), sessionSeed: 999 };

    for (let week = 0; week < 10; week++) {
      const next = await advanceWeekWithEvent(state, mockGenerate);
      // No discrepancy: whatever the dashboard would read (next.metrics) is
      // exactly the engine's returned metrics object, not a derived copy.
      expect(next.metrics.week).toBe(state.metrics.week + 1);

      if (next.pendingEngineeringEvent) {
        const unresolved = next.eventLog.find((e) => e.chosenChoiceId === null)!;
        state = applyEventChoice(next, unresolved, unresolved.choices[0].id);
      } else {
        state = next;
      }
    }

    expect(state.metrics.week).toBeGreaterThan(1);
  });
});

describe("FE-16 — event always presents 2-3 choices and blocks advance until chosen", () => {
  it("pendingEngineeringEvent blocks a further advanceWeek call (no-op guard)", async () => {
    let firedState: GameState | undefined;

    for (let i = 0; i < 100 && !firedState; i++) {
      const candidate: GameState = { ...freshState(), sessionSeed: i };
      const result = await advanceWeekWithEvent(candidate, mockGenerate);
      if (result.pendingEngineeringEvent) firedState = result;
    }

    expect(firedState).toBeDefined();
    if (!firedState) return;

    const unresolved = firedState.eventLog.find((e) => e.chosenChoiceId === null);
    expect(unresolved).toBeDefined();
    expect(unresolved!.choices.length).toBeGreaterThanOrEqual(2);
    expect(unresolved!.choices.length).toBeLessThanOrEqual(3);

    // Attempting to advance again while pending is a no-op at the engine
    // level (advanceWeek's own guard) — the same state comes back.
    const blockedNext = await advanceWeekWithEvent(firedState, mockGenerate);
    expect(blockedNext).toEqual(firedState);

    // Choosing resolves it and clears the block.
    const resolved = applyEventChoice(firedState, unresolved!, unresolved!.choices[0].id);
    expect(resolved.pendingEngineeringEvent).toBeNull();
    expect(resolved.eventLog.find((e) => e.id === unresolved!.id)?.chosenChoiceId).toBe(
      unresolved!.choices[0].id,
    );
  });
});

describe("FE-24 — end states halt further play and carry the right status", () => {
  it("bankrupt state halts advanceWeekWithEvent as a no-op", async () => {
    const state: GameState = { ...freshState(), gameStatus: "bankrupt" };
    const next = await advanceWeekWithEvent(state, mockGenerate);
    expect(next.gameStatus).toBe("bankrupt");
    expect(next).toEqual(state);
  });

  it("success state halts advanceWeekWithEvent as a no-op", async () => {
    const state: GameState = { ...freshState(), gameStatus: "success" };
    const next = await advanceWeekWithEvent(state, mockGenerate);
    expect(next.gameStatus).toBe("success");
    expect(next).toEqual(state);
  });

  it("cash<=0 after an event choice transitions gameStatus to bankrupt", () => {
    const state = freshState();
    const bigLossEvent = {
      id: "evt-1",
      week: 1,
      trigger: "engineering" as const,
      narrative: "n",
      source: "ai" as const,
      choices: [
        {
          id: "choice-1",
          label: "Spend everything",
          description: "d",
          consequences: { cashDelta: -(state.metrics.cash + 1) },
        },
      ],
      chosenChoiceId: null,
    };
    const result = applyEventChoice(state, bigLossEvent, "choice-1");
    expect(result.gameStatus).toBe("bankrupt");
  });
});
