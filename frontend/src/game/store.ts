// Zustand store wrapping GameState — DM-2.
//
// IMPORTANT: actions here are THIN wrappers only. No business/simulation
// logic lives in this file — that belongs to the pure engine functions of a
// later stage (Epic B/C in eng-tasks.md), which will call `applyState` (or a
// state-updater function) to commit their computed result. This store's job
// is state-holding + persistence orchestration, nothing else.

import { create } from "zustand";
import { createNewGameState, type NewGameInput } from "./factory";
import { loadGameState, saveGameState } from "./storage";
import type { GameState } from "./types";

export interface GameStore {
  /** `null` means "no game yet" (pre-boot, or no save + no new game started). */
  state: GameState | null;
  /** Set once the initial boot-load from localStorage has been attempted. */
  hasHydrated: boolean;

  /** Boot-path entry point: attempt to load an existing save; else stays null. */
  hydrateFromStorage: () => void;

  /** Creates a brand-new game (company-creation flow), persists it, replaces state. */
  newGame: (input: NewGameInput) => void;

  /** Loads a given state directly (e.g. programmatic/test load), persists it. */
  loadState: (state: GameState) => void;

  /**
   * Generic setter the future turn engine calls with its computed next
   * state. This is the ONE mutation seam for all gameplay logic (advanceWeek,
   * applyEventChoice, acceptOffer, etc.) — the store itself never computes
   * game values.
   */
  applyState: (nextState: GameState) => void;

  /** Clears in-memory state only (does not touch storage). Mainly for tests. */
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: null,
  hasHydrated: false,

  hydrateFromStorage: () => {
    const loaded = loadGameState();
    set({ state: loaded, hasHydrated: true });
  },

  newGame: (input) => {
    const next = createNewGameState(input);
    saveGameState(next);
    set({ state: next });
  },

  loadState: (nextState) => {
    saveGameState(nextState);
    set({ state: nextState });
  },

  applyState: (nextState) => {
    saveGameState(nextState);
    set({ state: nextState });
  },

  reset: () => set({ state: null, hasHydrated: false }),
}));
