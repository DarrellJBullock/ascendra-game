// Cloud multi-save CRUD (Phase 2) against the Supabase `saved_games` table.
// Row-Level Security scopes every query to the signed-in user (user_id defaults
// to auth.uid()), so no user_id is passed here. Inert when Supabase is off.

import { getSupabase } from "@/src/lib/supabase";
import type { GameState } from "./types";

const TABLE = "saved_games";

export interface CloudSaveMeta {
  id: string;
  name: string;
  week: number;
  status: string;
  updated_at: string;
}

/** Pure, testable projection of a GameState into a `saved_games` row. Omits
 * `name` on updates (undefined keys are stripped) so a rename isn't clobbered. */
export function rowFromState(state: GameState, name?: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    state,
    week: state.metrics.week,
    status: state.gameStatus,
  };
  if (name !== undefined) row.name = name;
  return row;
}

export async function listCloudSaves(): Promise<CloudSaveMeta[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from(TABLE)
    .select("id,name,week,status,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as CloudSaveMeta[]) ?? [];
}

/** Creates a new named cloud save from the current state; returns its id. */
export async function createCloudSave(name: string, state: GameState): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud saves aren't configured.");
  const { data, error } = await sb.from(TABLE).insert(rowFromState(state, name)).select("id").single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

/** Overwrites an existing cloud save's state (autosync). */
export async function updateCloudSave(id: string, state: GameState): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from(TABLE)
    .update({ ...rowFromState(state), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function loadCloudSave(id: string): Promise<GameState | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from(TABLE).select("state").eq("id", id).single();
  if (error) throw new Error(error.message);
  return ((data as { state: GameState } | null)?.state as GameState) ?? null;
}

export async function deleteCloudSave(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
