import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { rowFromState } from "@/src/game/cloudSaves";
import { isSupabaseConfigured } from "@/src/lib/supabase";

describe("cloud saves (Phase 2 auth)", () => {
  it("rowFromState projects the GameState into a saves row with week + status", () => {
    const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
    const state = { ...s, metrics: { ...s.metrics, week: 7 }, gameStatus: "in_progress" as const };
    const row = rowFromState(state, "My Startup");
    expect(row.name).toBe("My Startup");
    expect(row.week).toBe(7);
    expect(row.status).toBe("in_progress");
    expect(row.state).toBe(state);
  });

  it("omits name on updates (so a rename isn't clobbered)", () => {
    const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
    const row = rowFromState(s);
    expect("name" in row).toBe(false);
    expect(row.week).toBe(s.metrics.week);
  });

  it("is inert without env config (local-only mode)", () => {
    // No NEXT_PUBLIC_SUPABASE_* in the test env → cloud layer is off.
    expect(isSupabaseConfigured()).toBe(false);
  });
});
