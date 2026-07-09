"use client";

// Header auth control (Phase 2) — Sign in button, or the signed-in user with a
// sign-out menu. Renders nothing when cloud saves aren't configured, so the app
// is visually unchanged in local-only mode.

import { useEffect, useState } from "react";

import { useAuth } from "@/src/game/auth";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import AuthModal from "./AuthModal";

export default function AuthButton() {
  const { user, ready, init, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { init(); }, [init]);

  if (!isSupabaseConfigured()) return null;
  if (!ready) return null;

  if (!user) {
    return (
      <>
        <button type="button" onClick={() => setModalOpen(true)} className="btn btn-ghost px-3 py-2 text-xs">
          Sign in
        </button>
        {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  const label = user.email ?? "Account";
  return (
    <div className="relative">
      <button type="button" onClick={() => setMenuOpen((m) => !m)} className="btn btn-ghost px-3 py-2 text-xs" title={label}>
        <span aria-hidden>👤</span>
        <span className="hidden max-w-[120px] truncate sm:inline">{label.split("@")[0]}</span>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="card absolute right-0 z-50 mt-2 w-56 p-3 text-sm" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="truncate px-1 pb-2 text-xs" style={{ color: "var(--ink-3)" }}>{label}</div>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); void signOut(); }}
              className="btn btn-ghost w-full px-3 py-2 text-xs"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
