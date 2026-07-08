"use client";

// Phase 3 — AI Board Meetings. Shown once the founder has investors. Convenes a
// quarterly board review (real AI via the advisor endpoint, board voice) with a
// board-framed fallback memo.

import { useEffect, useState } from "react";

import { useGameStore } from "@/src/game/store";
import { convokeBoard, currentQuarter, hasBoard } from "@/src/game/board";

export default function BoardButton() {
  const state = useGameStore((s) => s.state);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<{ reply: string; source: "ai" | "fallback" } | null>(null);

  useEffect(() => {
    if (!open || !state) return;
    let cancelled = false;
    setLoading(true);
    setReview(null);
    convokeBoard(state).then((r) => {
      if (!cancelled) {
        setReview(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // Convene once per open (based on the week it was opened).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!state || !hasBoard(state)) return null;

  const quarter = currentQuarter(state.metrics.week);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost px-3 py-2 text-xs" title="Convene a board meeting">
        🏛 Board
      </button>

      {open && (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(4, 6, 12, 0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div className="anim-pop card flex w-full max-w-lg flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-6 py-4" style={{ background: "var(--accent-soft)", borderBottom: "1px solid var(--border)" }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }} aria-hidden>🏛</span>
              <div className="flex flex-col">
                <span className="eyebrow" style={{ color: "var(--accent)" }}>Board meeting</span>
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Q{quarter} review · Week {state.metrics.week}</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost ml-auto px-3 py-1.5 text-sm" aria-label="Close">✕</button>
            </div>

            <div className="p-6">
              {loading || !review ? (
                <p className="text-sm" style={{ color: "var(--ink-3)" }}>The board is deliberating…</p>
              ) : (
                <>
                  <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink)" }}>{review.reply}</p>
                  {review.source === "fallback" && (
                    <p className="mt-3 text-[11px]" style={{ color: "var(--ink-3)" }}>board memo · live AI unavailable</p>
                  )}
                </>
              )}
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-primary px-4 py-2 text-sm">Noted</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
