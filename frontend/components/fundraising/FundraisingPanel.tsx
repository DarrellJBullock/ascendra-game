"use client";

// Client Component: entirely interactive (trigger a raise, accept/decline
// buttons, reads/writes the Zustand store directly) — no server-renderable
// content here. Self-contained per the interface contract: default export,
// no required props, mounted as `<FundraisingPanel />` by the dashboard.

import { useState } from "react";

import { useGameStore } from "@/src/game/store";
import {
  acceptOffer,
  canRaiseThisWeek,
  declineOffer,
  generateFundraisingOffer,
  isRoundAvailable,
} from "@/src/game/fundraising";
import { formatCurrency } from "@/components/dashboard/formatters";
import type { FundraisingRoundType } from "@/src/game/types";

const ROUND_OPTIONS: FundraisingRoundType[] = ["Angel", "Seed"];

export default function FundraisingPanel() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);
  const [selectedRound, setSelectedRound] = useState<FundraisingRoundType>("Angel");

  if (!state) return null;

  const currentWeek = state.metrics.week;
  const canRaise = canRaiseThisWeek(state) && state.gameStatus === "in_progress";

  const pendingOffer = state.fundraisingOffers.find(
    (o) => o.week === currentWeek && o.status === "pending",
  );
  const resolvedThisWeek = state.fundraisingOffers.find(
    (o) => o.week === currentWeek && o.status !== "pending",
  );

  function handleRaise() {
    if (!state || !canRaise) return;
    const offer = generateFundraisingOffer(
      selectedRound,
      state.metrics,
      state.company.founderModifiers,
    );
    applyState({ ...state, fundraisingOffers: [...state.fundraisingOffers, offer] });
  }

  function handleAccept() {
    if (!state || !pendingOffer) return;
    applyState(acceptOffer(state, pendingOffer.id));
  }

  function handleDecline() {
    if (!state || !pendingOffer) return;
    applyState(declineOffer(state, pendingOffer.id));
  }

  return (
    <div className="card flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Fundraising</h2>
          <p className="eyebrow" style={{ marginTop: 2 }}>Trade equity for runway</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
            {state.metrics.founderOwnershipPct.toFixed(1)}%
          </div>
          <div className="eyebrow" style={{ marginTop: 1 }}>you own</div>
        </div>
      </div>

      {pendingOffer ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {pendingOffer.roundType} round
              </span>
              <span className="pill pill-muted">offer on the table</span>
            </div>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt style={{ color: "var(--ink-2)" }}>Cash offered</dt>
                <dd className="font-semibold tabular-nums" style={{ color: "var(--good)" }}>
                  +{formatCurrency(pendingOffer.offeredCash)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt style={{ color: "var(--ink-2)" }}>Implied valuation</dt>
                <dd className="tabular-nums" style={{ color: "var(--ink)" }}>{formatCurrency(pendingOffer.impliedValuation)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt style={{ color: "var(--ink-2)" }}>Equity requested</dt>
                <dd className="tabular-nums" style={{ color: "var(--crit)" }}>−{pendingOffer.equityPct}%</dd>
              </div>
            </dl>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAccept} className="btn btn-primary flex-1 px-3 py-2.5 text-sm">
              Accept
            </button>
            <button type="button" onClick={handleDecline} className="btn btn-ghost flex-1 px-3 py-2.5 text-sm">
              Decline
            </button>
          </div>
        </div>
      ) : resolvedThisWeek ? (
        <p
          className="rounded-xl px-3 py-3 text-xs leading-relaxed"
          style={{ background: "var(--surface-2)", color: "var(--ink-3)", border: "1px solid var(--border)" }}
        >
          You already {resolvedThisWeek.status} a {resolvedThisWeek.roundType} offer this week. Come
          back next week.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {ROUND_OPTIONS.map((round) => {
              const available = isRoundAvailable(round, state.metrics);
              return (
                <button
                  key={round}
                  type="button"
                  disabled={!available}
                  onClick={() => setSelectedRound(round)}
                  aria-pressed={selectedRound === round}
                  className="chip px-3 py-2.5 text-sm font-medium"
                >
                  {round}
                  {!available && round === "Seed" ? " 🔒" : ""}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!canRaise || !isRoundAvailable(selectedRound, state.metrics)}
            onClick={handleRaise}
            className="btn btn-primary w-full px-3 py-2.5 text-sm"
          >
            Attempt raise
          </button>
          {!isRoundAvailable("Seed", state.metrics) && (
            <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
              Seed unlocks once you reach the MRR threshold.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
