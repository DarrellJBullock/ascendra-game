"use client";

// "Your companies" — cloud multi-save list (Phase 2), shown on the landing page.
// Renders nothing when cloud saves aren't configured (local-only mode).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/src/game/auth";
import { useGameStore } from "@/src/game/store";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import {
  createCloudSave,
  deleteCloudSave,
  listCloudSaves,
  loadCloudSave,
  type CloudSaveMeta,
} from "@/src/game/cloudSaves";
import AuthModal from "./AuthModal";
import GoogleButton from "./GoogleButton";

const OUTCOME_LABEL: Record<string, string> = {
  in_progress: "in progress", bankrupt: "bankrupt", success: "won", ipo: "IPO",
  unicorn: "unicorn 🦄", acquired: "acquired", lifestyle: "lifestyle",
};

export default function CloudSavesList() {
  const { user, ready, init } = useAuth();
  const localState = useGameStore((s) => s.state);
  const activeId = useGameStore((s) => s.activeCloudSaveId);
  const [saves, setSaves] = useState<CloudSaveMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => { init(); }, [init]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setSaves(await listCloudSaves());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
    else setSaves([]);
  }, [user, refresh]);

  if (!isSupabaseConfigured() || !ready) return null;

  if (!user) {
    return (
      <>
        <div className="card flex flex-col gap-3.5 p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>☁️</span>
            <p className="flex-1 text-sm" style={{ color: "var(--ink-2)" }}>
              Sign in to save your companies to the cloud and pick up on any device.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <GoogleButton className="flex-1" />
            <button type="button" onClick={() => setModalOpen(true)} className="btn btn-ghost flex-1 px-4 py-2.5 text-sm">
              Sign in with email
            </button>
          </div>
        </div>
        {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  async function loadGame(id: string) {
    setBusy(true);
    setError(null);
    try {
      const state = await loadCloudSave(id);
      if (state) {
        useGameStore.getState().loadState(state);
        useGameStore.getState().setActiveCloudSaveId(id);
        router.push("/play");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrent() {
    if (!localState) return;
    setBusy(true);
    setError(null);
    try {
      const name = window.prompt("Name this save", localState.company.name) ?? localState.company.name;
      const id = await createCloudSave(name, localState);
      useGameStore.getState().setActiveCloudSaveId(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this saved company?")) return;
    setBusy(true);
    try {
      await deleteCloudSave(id);
      if (activeId === id) useGameStore.getState().setActiveCloudSaveId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Your companies</h2>
        {localState && (
          <button type="button" onClick={() => void saveCurrent()} disabled={busy} className="btn btn-ghost px-3 py-1.5 text-xs">
            ☁ Save current game
          </button>
        )}
      </div>

      {error && <p className="text-xs" style={{ color: "var(--crit)" }}>{error}</p>}

      {saves.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>No cloud saves yet — start a company below, then click “Save current game”.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {saves.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "var(--surface-2)" }}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>
                  {s.name}
                  {activeId === s.id && <span className="pill pill-muted ml-2">synced</span>}
                </div>
                <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                  Week {s.week} · {OUTCOME_LABEL[s.status] ?? s.status} · {new Date(s.updated_at).toLocaleDateString()}
                </div>
              </div>
              <button type="button" onClick={() => void loadGame(s.id)} disabled={busy} className="btn btn-primary px-3 py-1.5 text-xs">Load</button>
              <button type="button" onClick={() => void remove(s.id)} disabled={busy} className="rounded-md px-2 py-1 text-xs" style={{ color: "var(--crit)", background: "var(--crit-soft)" }} aria-label="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
