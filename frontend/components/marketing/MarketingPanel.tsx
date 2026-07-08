"use client";

// Phase 3 — Marketing panel. Client Component, self-contained default export.
// Run one campaign per week (cash → immediate customers + brand awareness) and
// watch brand + the LTV:CAC efficiency signal.

import { useState } from "react";

import { useGameStore } from "@/src/game/store";
import {
  CAMPAIGNS,
  CAMPAIGN_ORDER,
  canAffordCampaign,
  canTakeMarketingActionThisWeek,
  computeCAC,
  estimateLTV,
  runCampaign,
} from "@/src/game/marketing";
import { formatCurrency } from "@/components/dashboard/formatters";
import type { MarketingCampaignType } from "@/src/game/types";

export default function MarketingPanel() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);
  const [selected, setSelected] = useState<MarketingCampaignType>("social");

  if (!state) return null;

  const canAct = canTakeMarketingActionThisWeek(state);
  const thisWeek = (state.marketingActions ?? []).find((a) => a.week === state.metrics.week);
  const brand = Math.round(state.metrics.brandAwareness ?? 0);
  const ltv = estimateLTV(state);
  const cac = computeCAC(state);
  const ratio = cac && cac > 0 ? ltv / cac : null;
  const selectedCost = CAMPAIGNS[selected].cost;
  const canAfford = canAffordCampaign(state, selected);

  return (
    <div className="card flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Marketing</h2>
          <p className="eyebrow" style={{ marginTop: 2 }}>Campaigns &amp; brand</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{brand}</div>
          <div className="eyebrow" style={{ marginTop: 1 }}>brand</div>
        </div>
      </div>

      {/* Brand bar */}
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${brand}%`, background: "linear-gradient(90deg, var(--accent-2), var(--accent))" }} />
      </div>

      {/* LTV : CAC */}
      <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: "var(--surface-2)" }}>
        <span style={{ color: "var(--ink-3)" }}>LTV <span className="font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{formatCurrency(ltv)}</span></span>
        <span style={{ color: "var(--ink-3)" }}>CAC <span className="font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{cac === null ? "—" : formatCurrency(cac)}</span></span>
        <span style={{ color: "var(--ink-3)" }}>ratio <span className="font-semibold tabular-nums" style={{ color: ratio === null ? "var(--ink)" : ratio >= 3 ? "var(--good)" : ratio >= 1 ? "var(--warn)" : "var(--crit)" }}>{ratio === null ? "—" : `${ratio.toFixed(1)}x`}</span></span>
      </div>

      {thisWeek ? (
        <p className="rounded-xl px-3 py-2.5 text-[11px]" style={{ background: "var(--surface-2)", color: "var(--ink-3)", border: "1px solid var(--border)" }}>
          Ran a {CAMPAIGNS[thisWeek.type].label} campaign this week — advance to run the next.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {CAMPAIGN_ORDER.map((type) => {
              const c = CAMPAIGNS[type];
              return (
                <button
                  key={type}
                  type="button"
                  disabled={!canAffordCampaign(state, type) || !canAct}
                  onClick={() => setSelected(type)}
                  aria-pressed={selected === type}
                  className="chip flex items-center justify-between gap-3 px-3.5 py-2 text-left"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{c.label}</span>
                    <span className="text-[11px]" style={{ color: selected === type ? "var(--accent-ink)" : "var(--ink-3)", opacity: selected === type ? 0.85 : 1 }}>
                      +{c.customers} cust · +{c.brand} brand
                    </span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums">{formatCurrency(c.cost)}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!canAct || !canAfford}
            onClick={() => applyState(runCampaign(state, selected))}
            className="btn btn-primary w-full px-3 py-2.5 text-sm"
          >
            {canAfford ? `Run campaign — ${formatCurrency(selectedCost)}` : "Not enough cash"}
          </button>
        </div>
      )}
    </div>
  );
}
