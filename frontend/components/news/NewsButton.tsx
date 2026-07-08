"use client";

// Phase 3 — News feed. A dashboard button opening a modal with an AI-authored
// ecosystem brief on top and a template-generated feed below. Generates the
// competitor set lazily if needed (news reports on them). No engine coupling.

import { useEffect, useState } from "react";

import { useGameStore } from "@/src/game/store";
import { generateCompetitors } from "@/src/game/competitors";
import { fetchNewsBrief, generateNewsItems, type NewsKind } from "@/src/game/news";

const KIND: Record<NewsKind, { icon: string; label: string; color: string }> = {
  competitor: { icon: "🎯", label: "Rivals", color: "var(--accent-2)" },
  company: { icon: "🚀", label: "Your company", color: "var(--good)" },
  market: { icon: "🌐", label: "Market", color: "var(--warn)" },
};

export default function NewsButton() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<{ reply: string; source: "ai" | "fallback" } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpen() {
    if (!state) return;
    if ((state.competitors ?? []).length === 0) {
      applyState({ ...state, competitors: generateCompetitors(state) });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open || !state) return;
    let cancelled = false;
    setLoading(true);
    setBrief(null);
    fetchNewsBrief(state).then((r) => {
      if (!cancelled) {
        setBrief(r);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!state) return null;

  const items = open ? generateNewsItems(state) : [];

  return (
    <>
      <button type="button" onClick={handleOpen} className="btn btn-ghost px-3 py-2 text-xs" title="Ecosystem news">
        📰 News
      </button>

      {open && (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          style={{ background: "rgba(4, 6, 12, 0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div className="anim-pop flex w-full max-w-xl flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>📰 The Wire · Week {state.metrics.week}</h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost px-3 py-1.5 text-sm" aria-label="Close">✕</button>
            </div>

            {/* AI brief */}
            <div className="card p-5">
              <h3 className="eyebrow mb-2" style={{ color: "var(--accent)" }}>This week in {state.company.industry}</h3>
              {loading || !brief ? (
                <p className="text-sm" style={{ color: "var(--ink-3)" }}>Filing the story…</p>
              ) : (
                <>
                  <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink)" }}>{brief.reply}</p>
                  {brief.source === "fallback" && (
                    <p className="mt-2 text-[11px]" style={{ color: "var(--ink-3)" }}>wire copy · live AI unavailable</p>
                  )}
                </>
              )}
            </div>

            {/* Feed */}
            <div className="card p-5">
              <h3 className="eyebrow mb-3" style={{ color: "var(--accent)" }}>Headlines</h3>
              <div className="flex flex-col gap-2.5">
                {items.map((it) => {
                  const k = KIND[it.kind];
                  return (
                    <div key={it.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "var(--surface-2)" }}>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} aria-hidden>{k.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm" style={{ color: "var(--ink)" }}>{it.headline}</div>
                        <div className="text-[10px] uppercase tracking-wide" style={{ color: k.color }}>{k.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
