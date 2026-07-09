"use client";

// Sign-in modal — magic link + Google (Phase 2).

import { useState } from "react";

import { useAuth } from "@/src/game/auth";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    setError(null);
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setError(error);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div
      className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4, 6, 12, 0.62)", backdropFilter: "blur(7px)" }}
      onClick={onClose}
    >
      <div className="anim-pop card flex w-full max-w-sm flex-col gap-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>Sign in</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>Save your companies to the cloud and play across devices.</p>
        </div>

        {status === "sent" ? (
          <div className="rounded-xl p-4 text-sm" style={{ background: "var(--good-soft)", color: "var(--ink)" }}>
            ✓ Check your inbox — we sent a magic link to <span className="font-semibold">{email}</span>.
          </div>
        ) : (
          <>
            <button type="button" onClick={() => void signInWithGoogle()} className="btn btn-ghost w-full px-4 py-2.5 text-sm">
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--ink-3)" }}>
              <span className="h-px flex-1" style={{ background: "var(--border)" }} /> or <span className="h-px flex-1" style={{ background: "var(--border)" }} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void sendLink(); }}
              placeholder="you@example.com"
              className="field w-full px-3 py-2.5 text-sm"
            />
            <button type="button" onClick={() => void sendLink()} disabled={!email.trim() || status === "sending"} className="btn btn-primary w-full px-4 py-2.5 text-sm">
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="text-xs" style={{ color: "var(--crit)" }}>{error}</p>}
          </>
        )}

        <button type="button" onClick={onClose} className="text-xs" style={{ color: "var(--ink-3)" }}>Close</button>
      </div>
    </div>
  );
}
