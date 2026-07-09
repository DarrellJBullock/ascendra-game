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

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const avatar = meta.avatar_url ?? meta.picture;
  const name = meta.full_name ?? meta.name ?? user.email ?? "Account";
  const email = user.email ?? "";

  return (
    <div className="relative">
      <button type="button" onClick={() => setMenuOpen((m) => !m)} className="btn btn-ghost gap-1.5 px-2 py-1.5 text-xs" title={name}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" width={22} height={22} referrerPolicy="no-referrer" className="rounded-full" style={{ width: 22, height: 22 }} />
        ) : (
          <span aria-hidden>👤</span>
        )}
        <span className="hidden max-w-[120px] truncate sm:inline">{name.split("@")[0]}</span>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="card absolute right-0 z-50 mt-2 w-60 p-3 text-sm" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center gap-2.5 px-1 pb-2.5">
              {avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" width={32} height={32} referrerPolicy="no-referrer" className="rounded-full" style={{ width: 32, height: 32 }} />
              )}
              <div className="min-w-0">
                <div className="truncate font-medium" style={{ color: "var(--ink)" }}>{name}</div>
                {email && <div className="truncate text-[11px]" style={{ color: "var(--ink-3)" }}>{email}</div>}
              </div>
            </div>
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
