"use client";

// FE-14/FE-15 — modal/blocking event card: narrative + 2-3 choice buttons
// with tradeoff descriptions. Client Component: it's purely interactive
// (button clicks driving a store-mutating callback), no reason to be a
// Server Component.
//
// Blocking guarantee: this renders as a full-screen overlay with no close/
// dismiss affordance and no backdrop-click-to-close handler, so there is no
// way to advance without picking one of the rendered choices (FE-14 AC).

import type { EventChoice, EventLogRecord } from "@/src/game/types";

export interface EventCardProps {
  event: EventLogRecord;
  onChoose: (choiceId: string) => void;
}

function ChoiceButton({
  choice,
  onChoose,
}: {
  choice: EventChoice;
  onChoose: (choiceId: string) => void;
}) {
  const { cashDelta, technicalDebtDelta, customerCountDelta } =
    choice.consequences;

  return (
    <button
      type="button"
      onClick={() => onChoose(choice.id)}
      className="flex flex-col gap-1 rounded-md border border-zinc-300 p-4 text-left hover:border-black dark:border-zinc-700 dark:hover:border-white"
    >
      <span className="font-semibold">{choice.label}</span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {choice.description}
      </span>
      <span className="mt-1 flex gap-3 text-xs text-zinc-500 dark:text-zinc-500">
        {cashDelta !== undefined && cashDelta !== 0 && (
          <span>Cash {cashDelta > 0 ? "+" : ""}{cashDelta.toLocaleString()}</span>
        )}
        {technicalDebtDelta !== undefined && technicalDebtDelta !== 0 && (
          <span>
            Tech debt {technicalDebtDelta > 0 ? "+" : ""}
            {technicalDebtDelta}
          </span>
        )}
        {customerCountDelta !== undefined && customerCountDelta !== 0 && (
          <span>
            Customers {customerCountDelta > 0 ? "+" : ""}
            {customerCountDelta}
          </span>
        )}
      </span>
    </button>
  );
}

export function EventCard({ event, onChoose }: EventCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-lg bg-white p-6 dark:bg-zinc-900">
        <div>
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Engineering event — week {event.week}
          </span>
          <p className="mt-2 text-sm">{event.narrative}</p>
        </div>
        <div className="flex flex-col gap-3">
          {event.choices.map((choice) => (
            <ChoiceButton key={choice.id} choice={choice} onChoose={onChoose} />
          ))}
        </div>
      </div>
    </div>
  );
}
