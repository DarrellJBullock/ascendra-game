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

const CLOUD_ACTIVE_KEY = "ascendra:cloud-active";

function readActiveCloudId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLOUD_ACTIVE_KEY);
  } catch {
    return null;
  }
}
function writeActiveCloudId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(CLOUD_ACTIVE_KEY, id);
    else window.localStorage.removeItem(CLOUD_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export interface GameStore {
  /** `null` means "no game yet" (pre-boot, or no save + no new game started). */
  state: GameState | null;
  /** Set once the initial boot-load from localStorage has been attempted. */
  hasHydrated: boolean;
  /** Phase 2 — the cloud save row this game is linked to (autosync target), or
   * null for a local-only game. Persisted so a refresh keeps syncing. */
  activeCloudSaveId: string | null;
  /** Links/unlinks the current game to a cloud save (autosync target). */
  setActiveCloudSaveId: (id: string | null) => void;

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
  activeCloudSaveId: null,

  setActiveCloudSaveId: (id) => {
    writeActiveCloudId(id);
    set({ activeCloudSaveId: id });
  },

  hydrateFromStorage: () => {
    const loaded = loadGameState();
    set({ state: loaded, hasHydrated: true, activeCloudSaveId: readActiveCloudId() });
  },

  newGame: (input) => {
    const next = createNewGameState(input);
    saveGameState(next);
    writeActiveCloudId(null); // a fresh local game isn't linked to a cloud save
    set({ state: next, activeCloudSaveId: null });
  },

  loadState: (nextState) => {
    saveGameState(nextState);
    set({ state: nextState });
  },

  applyState: (nextState) => {
    saveGameState(nextState);
    set({ state: nextState });
  },

  reset: () => {
    writeActiveCloudId(null);
    set({ state: null, hasHydrated: false, activeCloudSaveId: null });
  },
}));
