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
    applyState({
      ...state,
      fundraisingOffers: [...state.fundraisingOffers, offer],
    });
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
    <div className="rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
      <h2 className="text-sm font-semibold">Fundraising</h2>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Founder ownership: {state.metrics.founderOwnershipPct.toFixed(1)}%
      </p>

      {pendingOffer ? (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <p className="font-medium">{pendingOffer.roundType} round offer</p>
          <ul className="flex flex-col gap-1">
            <li className="flex justify-between gap-4">
              <span>Offered cash</span>
              <span>${pendingOffer.offeredCash.toLocaleString()}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Implied valuation</span>
              <span>${pendingOffer.impliedValuation.toLocaleString()}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Equity requested</span>
              <span>{pendingOffer.equityPct}%</span>
            </li>
          </ul>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-black"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold dark:border-zinc-700"
            >
              Decline
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {resolvedThisWeek ? (
            <p className="text-xs text-zinc-500">
              You already {resolvedThisWeek.status} a {resolvedThisWeek.roundType}{" "}
              offer this week. Try again next week.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {ROUND_OPTIONS.map((round) => {
                  const available = isRoundAvailable(round, state.metrics);
                  return (
                    <button
                      key={round}
                      type="button"
                      disabled={!available}
                      onClick={() => setSelectedRound(round)}
                      aria-pressed={selectedRound === round}
                      className={`rounded-md border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                        selectedRound === round
                          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                          : "border-zinc-300 dark:border-zinc-700"
                      }`}
                    >
                      {round}
                      {!available && round === "Seed" ? " (locked)" : ""}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!canRaise || !isRoundAvailable(selectedRound, state.metrics)}
                onClick={handleRaise}
                className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
              >
                Attempt raise
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
