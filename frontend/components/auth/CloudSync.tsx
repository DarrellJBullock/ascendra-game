"use client";

// Autosync (Phase 2): while signed in with a linked cloud save, debounce-writes
// the game state to that cloud row on every change. Renders nothing. Inert when
// not signed in or the game isn't cloud-linked (local-only play is unaffected).

import { useEffect, useRef } from "react";

import { useAuth } from "@/src/game/auth";
import { useGameStore } from "@/src/game/store";
import { updateCloudSave } from "@/src/game/cloudSaves";

export default function CloudSync() {
  const state = useGameStore((s) => s.state);
  const activeId = useGameStore((s) => s.activeCloudSaveId);
  const user = useAuth((s) => s.user);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state || !activeId || !user) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      updateCloudSave(activeId, state).catch(() => {
        /* best-effort; localStorage remains the source of truth offline */
      });
    }, 2500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, activeId, user]);

  return null;
}
