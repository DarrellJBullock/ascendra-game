"use client";

// Playtest instrumentation (QA-2): one-click copy of the run summary to the
// clipboard, so a tester can paste their exact stats to the facilitator instead
// of guessing "how many weeks did I reach". Works mid-game (boredom quit) and on
// the end screen. Client Component — uses the clipboard API on click.

import { useState } from "react";

import { buildRunSummary } from "@/src/game/runSummary";
import type { GameState } from "@/src/game/types";

export default function CopyRunButton({
  state,
  label = "Copy my run",
  variant = "ghost",
}: {
  state: GameState;
  label?: string;
  variant?: "ghost" | "subtle";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = buildRunSummary(state);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard blocked (permissions/insecure context) — fall back to a prompt
      // so the tester can still copy manually.
      window.prompt("Copy your run summary:", text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (variant === "subtle") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="text-[11px] font-medium underline-offset-2 hover:underline"
        style={{ color: "var(--ink-3)" }}
      >
        {copied ? "✓ copied — paste it to the facilitator" : `📋 ${label} (for playtest)`}
      </button>
    );
  }

  return (
    <button type="button" onClick={handleCopy} className="btn btn-ghost w-full px-4 py-3 text-sm">
      {copied ? "✓ Copied to clipboard" : `📋 ${label}`}
    </button>
  );
}
