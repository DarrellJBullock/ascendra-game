"use client";

// Phase 3 — Customer Segments panel. Client Component. Self-contained default
// export. Lets the player set an acquisition FOCUS (SMB / Mid-Market /
// Enterprise / Government) — a free strategic stance that pulls the customer mix
// upmarket over time — and shows the current blended economics + mix breakdown.

import { useGameStore } from "@/src/game/store";
import {
  DEFAULT_SEGMENT_MIX,
  SEGMENTS,
  SEGMENT_ORDER,
  blendedPrice,
  segmentCounts,
  setSegmentFocus,
} from "@/src/game/segments";
import { formatCurrency, formatNumber } from "@/components/dashboard/formatters";
import type { CustomerSegment } from "@/src/game/types";

const SEG_COLOR: Record<CustomerSegment, string> = {
  smb: "var(--accent)",
  midmarket: "var(--accent-2)",
  enterprise: "var(--good)",
  government: "var(--warn)",
};

export default function SegmentsPanel() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);

  if (!state) return null;

  const mix = state.metrics.segmentMix ?? DEFAULT_SEGMENT_MIX;
  const focus = state.segmentFocus ?? "smb";
  const counts = segmentCounts(mix, state.metrics.customerCount);
  const price = blendedPrice(mix);
  const canAct = state.gameStatus === "in_progress";

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Customer segments</h2>
          <p className="eyebrow" style={{ marginTop: 2 }}>Acquisition focus &amp; market mix</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{formatCurrency(price)}</div>
          <div className="eyebrow" style={{ marginTop: 1 }}>rev / customer</div>
        </div>
      </div>

      {/* Mix bar */}
      <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        {SEGMENT_ORDER.map((seg) =>
          mix[seg] > 0.001 ? (
            <div key={seg} title={`${SEGMENTS[seg].label} ${Math.round(mix[seg] * 100)}%`} style={{ width: `${mix[seg] * 100}%`, background: SEG_COLOR[seg] }} />
          ) : null,
        )}
      </div>

      {/* Focus selector */}
      <div className="grid grid-cols-2 gap-2">
        {SEGMENT_ORDER.map((seg) => {
          const cfg = SEGMENTS[seg];
          const selected = focus === seg;
          return (
            <button
              key={seg}
              type="button"
              disabled={!canAct}
              onClick={() => applyState(setSegmentFocus(state, seg))}
              aria-pressed={selected}
              className="chip flex flex-col gap-0.5 px-3 py-2 text-left"
              title={cfg.blurb}
            >
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: SEG_COLOR[seg] }} />
                <span className="text-xs font-semibold">{cfg.label}</span>
              </span>
              <span className="text-[10px] tabular-nums" style={{ color: selected ? "var(--accent-ink)" : "var(--ink-3)", opacity: selected ? 0.85 : 1 }}>
                {formatCurrency(cfg.price)}/cust · {formatNumber(counts[seg])}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
        Upmarket = higher price &amp; stickier, but slower to acquire and higher support. Your mix drifts toward the focus each week.
      </p>
    </div>
  );
}
