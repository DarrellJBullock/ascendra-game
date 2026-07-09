"use client";

// Phase 3 — Sales pipeline view. A dashboard button opening a modal with the
// funnel (back-solved from your weekly acquisition + segment focus) and a
// forecast. Pure reporting — reframes existing acquisition, creates nothing.

import { useState } from "react";

import { useGameStore } from "@/src/game/store";
import { computePipeline } from "@/src/game/salesPipeline";
import { formatCurrency } from "@/components/dashboard/formatters";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: "var(--surface-2)" }}>
      <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{value}</div>
      <div className="eyebrow" style={{ marginTop: 1 }}>{label}</div>
    </div>
  );
}

export default function SalesPipelineButton() {
  const state = useGameStore((s) => s.state);
  const [open, setOpen] = useState(false);

  if (!state) return null;

  const p = computePipeline(state);
  const maxFlow = Math.max(1, p.stages[0].flow);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="tool-btn" data-tip="Sales pipeline & forecast">
        🧭 Pipeline
      </button>

      {open && (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          style={{ background: "rgba(4, 6, 12, 0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div className="anim-pop flex w-full max-w-xl flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>Sales pipeline · Week {state.metrics.week}</h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost px-3 py-1.5 text-sm" aria-label="Close">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="leads / wk" value={Math.round(p.leadsPerWeek).toString()} />
              <Metric label="win rate" value={`${(p.winRate * 100).toFixed(1)}%`} />
              <Metric label="sales cycle" value={`${p.cycleWeeks.toFixed(1)} wk`} />
              <Metric label="4-wk forecast" value={`+${Math.round(p.forecast4wk)}`} />
            </div>

            <div className="card p-5">
              <h3 className="eyebrow mb-3" style={{ color: "var(--accent)" }}>Funnel (deals / week)</h3>
              <div className="flex flex-col gap-2">
                {p.stages.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm" style={{ color: "var(--ink-2)" }}>{s.name}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded-md" style={{ background: "var(--surface-2)" }}>
                      <div
                        className="flex h-full items-center rounded-md px-2"
                        style={{ width: `${Math.max(3, (s.flow / maxFlow) * 100)}%`, background: s.name === "Closed Won" ? "var(--good)" : "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
                      >
                        <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--accent-ink)" }}>{s.flow.toFixed(1)}</span>
                      </div>
                    </div>
                    <span className="w-10 shrink-0 text-right text-[11px] tabular-nums" style={{ color: "var(--ink-3)" }}>
                      {s.convFromPrev === null ? "" : `${Math.round(s.convFromPrev * 100)}%`}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px]" style={{ color: "var(--ink-3)" }}>
                Weighted pipeline value (next 4 weeks × LTV): <span className="font-semibold" style={{ color: "var(--ink)" }}>{formatCurrency(p.forecastValue)}</span>. Your segment focus reshapes the funnel — upmarket is narrower, slower, but far more valuable per deal.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
