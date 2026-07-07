import { describe, expect, it } from "vitest";
import { createNewGameState } from "../factory";
import { advanceWeekWithEvent, buildEventContext } from "../turnOrchestration";
import type { GenerateNarrativeFn } from "../turnOrchestration";
import type { GameState } from "../types";

function freshState(): GameState {
  return createNewGameState({
    name: "Test Co",
    industry: "Fintech",
    founderType: "FinanceExecutive",
  });
}

const mockGenerate: GenerateNarrativeFn = async () => ({
  narrative: "AI narrative",
  choices: [
    { label: "A", description: "a", consequences: { cashDelta: -100 } },
    { label: "B", description: "b", consequences: { cashDelta: 0 } },
  ],
  source: "ai",
});

describe("advanceWeekWithEvent (FE-3)", () => {
  it("resolves to a normal week with no eventLog entry when no event rolls", async () => {
    const state = freshState();
    const next = await advanceWeekWithEvent(state, mockGenerate);
    if (!next.pendingEngineeringEvent) {
      expect(next.eventLog.length).toBe(state.eventLog.length);
    } else {
      expect(next.eventLog.length).toBe(state.eventLog.length + 1);
    }
  });

  it("materializes an EventLogRecord with 2-3 choices when an event rolls, using the injected generator", async () => {
    const state = freshState();
    let next: GameState | undefined;
    for (let i = 0; i < 50 && !next; i++) {
      const candidate: GameState = { ...state, sessionSeed: i };
      const result = await advanceWeekWithEvent(candidate, mockGenerate);
      if (result.pendingEngineeringEvent) {
        next = result;
      }
    }

    expect(next).toBeDefined();
    if (next) {
      expect(next.pendingEngineeringEvent).not.toBeNull();
      const unresolved = next.eventLog.find((e) => e.chosenChoiceId === null);
      expect(unresolved).toBeDefined();
      expect(unresolved!.choices.length).toBeGreaterThanOrEqual(2);
      expect(unresolved!.choices.length).toBeLessThanOrEqual(3);
      expect(unresolved!.source).toBe("ai");
    }
  });

  it("buildEventContext throws if no pending event exists", () => {
    const state = freshState();
    expect(() => buildEventContext(state)).toThrow();
  });

  it("is a no-op passthrough (via advanceWeek's own guard) once game has ended", async () => {
    const state = freshState();
    const ended: GameState = { ...state, gameStatus: "bankrupt" };
    const next = await advanceWeekWithEvent(ended, mockGenerate);
    expect(next).toEqual(ended);
  });
});
