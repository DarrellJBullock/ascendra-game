"use client";

// Phase 3 — AI Founder Advisor. A dashboard button opening a chat modal that
// reasons over the current game state. Real AI via the backend; falls back to a
// local heuristic tip on any failure so it's always useful.

import { useEffect, useRef, useState } from "react";

import { useGameStore } from "@/src/game/store";
import { askAdvisor, type AdvisorMessage } from "@/src/game/advisor";

interface ChatMessage extends AdvisorMessage {
  source?: "ai" | "fallback";
}

const SUGGESTIONS = ["What should I focus on this week?", "Should I raise money now?", "How am I doing?"];

export default function AdvisorButton() {
  const state = useGameStore((s) => s.state);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  if (!state) return null;

  async function send(text: string) {
    const q = text.trim();
    if (!q || sending || !state) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setSending(true);
    const result = await askAdvisor(state, q, history);
    setMessages((m) => [...m, { role: "assistant", content: result.reply, source: result.source }]);
    setSending(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost px-3 py-2 text-xs" title="Ask your AI advisor">
        💬 Advisor
      </button>

      {open && (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(4, 6, 12, 0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="anim-pop card flex h-[80vh] max-h-[640px] w-full max-w-lg flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span aria-hidden>💬</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Founder advisor</div>
                  <div className="eyebrow" style={{ marginTop: 1 }}>Grounded in your week {state.metrics.week} metrics</div>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost px-3 py-1.5 text-sm" aria-label="Close">✕</button>
            </div>

            <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    Ask me anything about your startup — strategy, fundraising, where to spend. I can see your current numbers.
                  </p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} className="chip px-3 py-2 text-left text-xs">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                    style={
                      m.role === "user"
                        ? { background: "var(--accent)", color: "var(--accent-ink)" }
                        : { background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)" }
                    }
                  >
                    {m.content}
                    {m.role === "assistant" && m.source === "fallback" && (
                      <span className="mt-1 block text-[10px]" style={{ color: "var(--ink-3)" }}>offline tip · advisor AI unavailable</span>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3.5 py-2.5 text-sm" style={{ background: "var(--surface-2)", color: "var(--ink-3)", border: "1px solid var(--border)" }}>
                    thinking…
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
                maxLength={500}
                placeholder="Ask your advisor…"
                disabled={sending}
                className="field flex-1 px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => send(input)} disabled={sending || !input.trim()} className="btn btn-primary px-4 py-2 text-sm">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
