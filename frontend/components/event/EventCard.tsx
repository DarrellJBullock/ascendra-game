"use client";

// FE-14/FE-15 — modal/blocking event card: narrative + 2-3 choice buttons
// with tradeoff descriptions. Client Component: it's purely interactive
// (button clicks driving a store-mutating callback), no reason to be a
// Server Component.
//
// Blocking guarantee: this renders as a full-screen overlay with no close/
// dismiss affordance and no backdrop-click-to-close handler, so there is no
// way to advance without picking one of the rendered choices (FE-14 AC).

import type { EventChoice, EventLogRecord, EventTrigger } from "@/src/game/types";
import { formatCurrency } from "@/components/dashboard/formatters";

export interface EventCardProps {
  event: EventLogRecord;
  onChoose: (choiceId: string) => void;
}

// Per-category header styling (icon, label, and a reserved status tint).
const CATEGORY: Record<EventTrigger, { icon: string; label: string; color: string; soft: string }> = {
  engineering: { icon: "⚙", label: "Engineering incident", color: "var(--warn)", soft: "var(--warn-soft)" },
  investor: { icon: "💼", label: "Investor relations", color: "var(--accent)", soft: "var(--accent-soft)" },
  people: { icon: "👥", label: "People & team", color: "var(--good)", soft: "var(--good-soft)" },
};

function ConsequenceChip({
  label,
  value,
  goodWhenUp,
  currency,
}: {
  label: string;
  value: number | undefined;
  goodWhenUp: boolean;
  currency?: boolean;
}) {
  if (value === undefined || value === 0) return null;
  const up = value > 0;
  const good = up === goodWhenUp;
  const mag = currency ? formatCurrency(Math.abs(value)) : Math.abs(value).toString();
  return (
    <span className={`pill ${good ? "pill-good" : "pill-crit"}`}>
      {up ? "▲" : "▼"} {label} {mag}
    </span>
  );
}

function ChoiceButton({
  choice,
  onChoose,
}: {
  choice: EventChoice;
  onChoose: (choiceId: string) => void;
}) {
  const { cashDelta, technicalDebtDelta, customerCountDelta } = choice.consequences;

  return (
    <button
      type="button"
      onClick={() => onChoose(choice.id)}
      className="group flex flex-col gap-1.5 rounded-xl p-4 text-left transition-all"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{choice.label}</span>
        <span
          aria-hidden
          className="translate-x-0 text-sm opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
          style={{ color: "var(--accent)" }}
        >
          →
        </span>
      </span>
      <span className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {choice.description}
      </span>
      <span className="mt-1 flex flex-wrap gap-1.5">
        <ConsequenceChip label="Cash" value={cashDelta} goodWhenUp currency />
        <ConsequenceChip label="Debt" value={technicalDebtDelta} goodWhenUp={false} />
        <ConsequenceChip label="Customers" value={customerCountDelta} goodWhenUp />
      </span>
    </button>
  );
}

export function EventCard({ event, onChoose }: EventCardProps) {
  return (
    <div
      className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4, 6, 12, 0.6)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="anim-pop card flex w-full max-w-lg flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header band (category-tinted) */}
        {(() => {
          const cat = CATEGORY[event.trigger] ?? CATEGORY.engineering;
          return (
            <div
              className="flex items-center gap-3 px-6 py-4"
              style={{ background: cat.soft, borderBottom: "1px solid var(--border)" }}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg"
                style={{ background: cat.soft, color: cat.color, border: `1px solid color-mix(in srgb, ${cat.color} 35%, transparent)` }}
                aria-hidden
              >
                {cat.icon}
              </span>
              <div className="flex flex-col">
                <span className="eyebrow" style={{ color: cat.color }}>{cat.label}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Week {event.week}</span>
              </div>
              {event.source === "ai" && (
                <span className="pill pill-muted ml-auto" title="AI-generated narrative">AI</span>
              )}
            </div>
          );
        })()}

        <div className="flex flex-col gap-4 p-6">
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink)" }}>
            {event.narrative}
          </p>
          <div className="flex flex-col gap-2.5">
            {event.choices.map((choice) => (
              <ChoiceButton key={choice.id} choice={choice} onChoose={onChoose} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
