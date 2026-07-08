"use client";

// Phase 4 — celebratory toasts for the delightful moments: closing a round,
// reaching profitability, and crossing customer milestones. Watches the store
// for transitions; self-contained, renders its own toast overlay.

import { useEffect, useRef, useState } from "react";

import { useGameStore } from "@/src/game/store";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const ROUND_LABEL: Record<string, string> = {
  Bootstrap: "Bootstrap", FriendsFamily: "Friends & Family", Angel: "Angel",
  Seed: "Seed", SeriesA: "Series A", SeriesB: "Series B",
};

function custTier(n: number): number {
  return n >= 500 ? 500 : n >= 250 ? 250 : n >= 100 ? 100 : 0;
}

export default function Celebrations() {
  const state = useGameStore((s) => s.state);
  const [toast, setToast] = useState<string | null>(null);
  const prev = useRef<{ raises: number; profitable: boolean; tier: number } | null>(null);

  useEffect(() => {
    if (!state) return;
    const accepted = (state.fundraisingOffers ?? []).filter((o) => o.status === "accepted");
    const snap = {
      raises: accepted.length,
      profitable: state.metrics.burnRate < 0 && state.metrics.customerCount > 0,
      tier: custTier(state.metrics.customerCount),
    };
    const p = prev.current;
    if (p) {
      if (snap.raises > p.raises) {
        const last = accepted[accepted.length - 1];
        setToast(`🎉 Raised ${money(last.offeredCash)} — ${ROUND_LABEL[last.roundType] ?? last.roundType} round`);
      } else if (snap.profitable && !p.profitable) {
        setToast("🟢 You've reached profitability!");
      } else if (snap.tier > p.tier) {
        setToast(`🚀 Crossed ${snap.tier.toLocaleString("en-US")} customers`);
      }
    }
    prev.current = snap;
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        className="toast-in shine flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
        style={{
          background: "var(--surface)",
          border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))",
          color: "var(--ink)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {toast}
      </div>
    </div>
  );
}
