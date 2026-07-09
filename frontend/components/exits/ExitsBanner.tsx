"use client";

// Phase 2 — endgame exits banner. Shows on the dashboard only when a player-
// chosen exit is available: an acquisition offer (valuation ≥ threshold) and/or
// a lifestyle-business option (sustainably profitable). Accepting ends the game
// as an "acquired" / "lifestyle" win. Self-contained default export.

import { useGameStore } from "@/src/game/store";
import {
  acceptAcquisition,
  acquisitionOffer,
  canGoLifestyle,
  canIpo,
  goLifestyle,
  goPublic,
} from "@/src/game/exits";
import { formatCurrency } from "@/components/dashboard/formatters";

export default function ExitsBanner() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);

  if (!state) return null;

  const ipo = canIpo(state);
  const acq = acquisitionOffer(state);
  const lifestyle = canGoLifestyle(state);
  if (!ipo && !acq.available && !lifestyle) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {ipo && (
        <div
          className="card shine flex flex-1 items-center gap-3 p-4"
          style={{ borderColor: "color-mix(in srgb, var(--good) 55%, transparent)", boxShadow: "0 0 0 1px color-mix(in srgb, var(--good) 30%, transparent), var(--shadow)" }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg" style={{ background: "var(--good-soft)" }} aria-hidden>🔔</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Ready to IPO — {formatCurrency(state.metrics.valuation)} valuation
            </p>
            <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>Go public for the win, or keep building toward a $1B unicorn.</p>
          </div>
          <button
            type="button"
            onClick={() => applyState(goPublic(state))}
            className="btn btn-primary shrink-0 px-3 py-2 text-sm"
          >
            Go public 🚀
          </button>
        </div>
      )}
      {acq.available && (
        <div
          className="card flex flex-1 items-center gap-3 p-4"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)" }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg" style={{ background: "var(--accent-soft)" }} aria-hidden>🤝</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Acquisition offer — {formatCurrency(acq.amount)}
            </p>
            <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>Take the exit now, or hold out for the $1M win.</p>
          </div>
          <button
            type="button"
            onClick={() => applyState(acceptAcquisition(state))}
            className="btn btn-primary shrink-0 px-3 py-2 text-sm"
          >
            Accept &amp; sell
          </button>
        </div>
      )}
      {lifestyle && (
        <div
          className="card flex flex-1 items-center gap-3 p-4"
          style={{ borderColor: "color-mix(in srgb, var(--good) 45%, transparent)" }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg" style={{ background: "var(--good-soft)" }} aria-hidden>🌴</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>You&apos;re profitable</p>
            <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>Settle into a sustainable lifestyle business — a modest, real win.</p>
          </div>
          <button
            type="button"
            onClick={() => applyState(goLifestyle(state))}
            className="btn btn-ghost shrink-0 px-3 py-2 text-sm"
          >
            Go lifestyle
          </button>
        </div>
      )}
    </div>
  );
}
