import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../factory";
import { clearGameState, loadGameState, saveGameState, SAVE_KEY } from "../storage";

describe("localStorage persistence (DM-3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loadGameState returns null when no save exists", () => {
    expect(loadGameState()).toBeNull();
  });

  it("saveGameState + loadGameState roundtrips without loss", () => {
    const state = createNewGameState({
      name: "Storage Co",
      industry: "Ecommerce",
      founderType: "MarketingExpert",
    });
    saveGameState(state);
    const loaded = loadGameState();
    expect(loaded).toEqual(state);
  });

  it("loadGameState returns null for corrupt JSON", () => {
    window.localStorage.setItem(SAVE_KEY, "{not valid json");
    expect(loadGameState()).toBeNull();
  });

  it("clearGameState removes the save", () => {
    const state = createNewGameState({
      name: "Clear Co",
      industry: "AI",
      founderType: "Engineer",
    });
    saveGameState(state);
    clearGameState();
    expect(loadGameState()).toBeNull();
  });
});
