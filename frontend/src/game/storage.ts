// localStorage persistence — DM-3.
//
// Single save slot, single key. Guards against SSR (localStorage does not
// exist server-side during Next.js server rendering); every function here is
// a no-op / returns null when `window` is unavailable.

import { PRODUCT_QUALITY_START } from "./constants";
import { DEFAULT_SEGMENT_MIX } from "./segments";
import type { GameState } from "./types";

export const SAVE_KEY = "ascendra:save:v1";

/**
 * Backfills fields added after a save was written, so a pre-feature save still
 * loads into a valid current-shape GameState. Additive only — never drops data.
 * Phase 2 added productQuality/innovation (metrics) and the employees list.
 */
function normalizeLoadedState(state: GameState): GameState {
  return {
    ...state,
    metrics: {
      ...state.metrics,
      productQuality: state.metrics.productQuality ?? PRODUCT_QUALITY_START,
      innovation: state.metrics.innovation ?? 0,
      segmentMix: state.metrics.segmentMix ?? { ...DEFAULT_SEGMENT_MIX },
      segmentExpansion: state.metrics.segmentExpansion ?? 0,
    },
    productActions: state.productActions ?? [],
    teamActions: state.teamActions ?? [],
    employees: state.employees ?? [],
    segmentFocus: state.segmentFocus ?? "smb",
    fundraisingOffers: state.fundraisingOffers ?? [],
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Persists the given state. No-op on the server. */
export function saveGameState(state: GameState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage can throw (quota exceeded, privacy mode, etc.) — persistence is
    // best-effort in v1; swallow so a save failure never breaks gameplay.
  }
}

/**
 * Loads a previously-saved state, if any.
 * Returns `null` for both "no save exists yet" and "server-side render" —
 * callers distinguish those only in that neither has a state to hydrate with.
 * Returns `null` also if the stored blob is corrupt/unparseable JSON.
 */
export function loadGameState(): GameState | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    return normalizeLoadedState(JSON.parse(raw) as GameState);
  } catch {
    return null;
  }
}

/** Clears the save slot. No-op on the server. */
export function clearGameState(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SAVE_KEY);
}
