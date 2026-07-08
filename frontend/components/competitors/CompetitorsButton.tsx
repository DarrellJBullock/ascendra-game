"use client";

// Phase 3 — Competitor Intelligence report. A dashboard button that opens a
// modal with the competitive landscape: market-share table + per-rival stats.
// Generates the rival set lazily on first open (never touches the engine).

import { useState } from "react";

import { useGameStore } from "@/src/game/store";
import {
  evolveCompetitor,
  generateCompetitors,
  marketShares,
  priceTierForPrice,
} from "@/src/game/competitors";
import { blendedPrice, DEFAULT_SEGMENT_MIX } from "@/src/game/segments";
import { formatCurrency } from "@/components/dashboard/formatters";

const TIER_LABEL: Record<string, string> = { budget: "Budget", mid: "Mid", premium: "Premium" };
const MOMENTUM: Record<number, { icon: string; color: string }> = {
  1: { icon: "▲", color: "var(--good)" },
  0: { icon: "▬", color: "var(--ink-3)" },
  [-1]: { icon: "▼", color: "var(--crit)" },
};

export default function CompetitorsButton() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);
  const [open, setOpen] = useState(false);

  if (!state) return null;

  const week = state.metrics.week;
  const competitors = state.competitors ?? [];

  function handleOpen() {
    if (!state) return;
    if ((state.competitors ?? []).length === 0) {
      applyState({ ...state, competitors: generateCompetitors(state) });
    }
    setOpen(true);
  }

  const playerName = `You · ${state.company.name}`;
  const rows = marketShares(competitors, state.metrics.customerCount, week, playerName);
  const playerTier = priceTierForPrice(blendedPrice(state.metrics.segmentMix ?? DEFAULT_SEGMENT_MIX));

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="btn btn-ghost px-3 py-2 text-xs"
        title="AI market — competitor landscape"
      >
        🎯 Competitors
      </button>

      {open && (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          style={{ background: "rgba(4, 6, 12, 0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div className="anim-pop flex w-full max-w-xl flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                Competitor intelligence · Week {week}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost px-3 py-1.5 text-sm" aria-label="Close">✕</button>
            </div>

            {/* Market share */}
            <div className="card p-5">
              <h3 className="eyebrow mb-3" style={{ color: "var(--accent)" }}>Market share (of customers)</h3>
              <div className="flex flex-col gap-2">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm font-medium" style={{ color: r.isPlayer ? "var(--accent)" : "var(--ink)" }}>{r.name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${r.sharePct}%`, background: r.isPlayer ? "var(--accent)" : "var(--ink-3)" }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{r.sharePct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rivals detail */}
            <div className="card p-5">
              <h3 className="eyebrow mb-3" style={{ color: "var(--accent)" }}>Rivals</h3>
              <div className="flex flex-col gap-3">
                {competitors.map((c) => {
                  const snap = evolveCompetitor(c, week);
                  const m = MOMENTUM[snap.momentum];
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5" style={{ background: "var(--surface-2)" }}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{c.name}</span>
                          <span style={{ color: m.color }}>{m.icon}</span>
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>{c.archetype} · {TIER_LABEL[c.priceTier]} pricing</div>
                      </div>
                      <div className="flex shrink-0 gap-4 text-right">
                        <div>
                          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{Math.round(snap.quality)}</div>
                          <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>quality</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{formatCurrency(snap.funding)}</div>
                          <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>raised</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px]" style={{ color: "var(--ink-3)" }}>
                You: quality {Math.round(state.metrics.productQuality)} · {TIER_LABEL[playerTier]} pricing · raised {formatCurrency((state.fundraisingOffers ?? []).filter((o) => o.status === "accepted").reduce((s, o) => s + o.offeredCash, 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
