import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "../store";
import { SAVE_KEY } from "../storage";

function resetStoreAndStorage() {
  window.localStorage.clear();
  useGameStore.getState().reset();
}

describe("Zustand store (DM-2/DM-3)", () => {
  beforeEach(() => {
    resetStoreAndStorage();
  });

  it("newGame creates a state and only sets expected fields", () => {
    useGameStore.getState().newGame({
      name: "Rocket Co",
      industry: "Ecommerce",
      founderType: "SalesLeader",
    });

    const { state } = useGameStore.getState();
    expect(state).not.toBeNull();
    expect(state?.company.name).toBe("Rocket Co");
    expect(state?.company.industry).toBe("Ecommerce");
    expect(state?.company.founderType).toBe("SalesLeader");
    expect(state?.metrics.week).toBe(1);
    expect(state?.gameStatus).toBe("in_progress");
  });

  it("newGame persists to localStorage under SAVE_KEY", () => {
    useGameStore.getState().newGame({
      name: "Persisto",
      industry: "AI",
      founderType: "Engineer",
    });

    const raw = window.localStorage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.company.name).toBe("Persisto");
  });

  it("applyState replaces state and re-persists, mutating only what's passed", () => {
    useGameStore.getState().newGame({
      name: "Mutate Co",
      industry: "AI",
      founderType: "Engineer",
    });

    const current = useGameStore.getState().state!;
    const nextState = {
      ...current,
      metrics: { ...current.metrics, week: 2, cash: current.metrics.cash - 5000 },
    };

    useGameStore.getState().applyState(nextState);

    const { state } = useGameStore.getState();
    expect(state?.metrics.week).toBe(2);
    expect(state?.metrics.cash).toBe(current.metrics.cash - 5000);
    // untouched fields remain identical
    expect(state?.company).toEqual(current.company);
    expect(state?.metrics.mrr).toBe(current.metrics.mrr);

    const raw = window.localStorage.getItem(SAVE_KEY);
    expect(JSON.parse(raw!).metrics.week).toBe(2);
  });

  describe("boot paths (DM-3)", () => {
    it("hydrateFromStorage results in null state when no save exists", () => {
      useGameStore.getState().hydrateFromStorage();
      const { state, hasHydrated } = useGameStore.getState();
      expect(state).toBeNull();
      expect(hasHydrated).toBe(true);
    });

    it("hydrateFromStorage loads existing save when one exists", () => {
      useGameStore.getState().newGame({
        name: "Existing Co",
        industry: "Fintech",
        founderType: "FinanceExecutive",
      });
      // simulate a fresh app boot: reset in-memory state but keep storage
      useGameStore.setState({ state: null, hasHydrated: false });

      useGameStore.getState().hydrateFromStorage();

      const { state, hasHydrated } = useGameStore.getState();
      expect(hasHydrated).toBe(true);
      expect(state?.company.name).toBe("Existing Co");
    });
  });
});
