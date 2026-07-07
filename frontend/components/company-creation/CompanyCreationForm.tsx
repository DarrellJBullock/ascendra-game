"use client";

// Client Component: this screen is entirely interactive (text input, radio
// selections, local validation state, and a store-mutating confirm action),
// so it cannot be a Server Component.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useGameStore } from "@/src/game/store";
import type { FounderType, Industry } from "@/src/game/types";
import { Wordmark } from "@/components/brand/Wordmark";
import {
  FOUNDER_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  isStartEnabled,
  validateCompanyName,
} from "./validation";
import { getFounderModifierSummary } from "./founderModifierSummary";

const INDUSTRY_BLURB: Record<Industry, string> = {
  AI: "Fast-moving, technical, infra-heavy.",
  Fintech: "Regulated, high-trust, enterprise buyers.",
  Ecommerce: "Consumer-facing, growth and margin driven.",
};

export function CompanyCreationForm() {
  const router = useRouter();
  const newGame = useGameStore((s) => s.newGame);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [founderType, setFounderType] = useState<FounderType | null>(null);
  const [touchedName, setTouchedName] = useState(false);

  const nameValidation = useMemo(() => validateCompanyName(name), [name]);
  const startEnabled = isStartEnabled(name, industry, founderType);

  const modifierSummary = useMemo(
    () => (founderType ? getFounderModifierSummary(founderType) : []),
    [founderType],
  );

  function handleStart() {
    if (!startEnabled || !industry || !founderType) return;
    newGame({ name: name.trim(), industry, founderType });
    router.push("/play");
  }

  return (
    <div className="anim-fade-up mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-14">
      <div className="flex flex-col gap-4">
        <Wordmark />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
            Found your company
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            Name it, pick an industry, and choose a founder background. These
            choices shape your playthrough from Week&nbsp;1 — the goal is a $1M
            valuation before you run out of cash.
          </p>
        </div>
      </div>

      <div className="card flex flex-col gap-7 p-6 sm:p-7">
        {/* Company name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="company-name" className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Company name
          </label>
          <input
            id="company-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouchedName(true)}
            maxLength={80}
            placeholder="e.g. Acme AI"
            className="field px-3.5 py-2.5 text-sm"
          />
          {touchedName && !nameValidation.valid && (
            <p className="text-xs font-medium" style={{ color: "var(--crit)" }}>
              {nameValidation.error}
            </p>
          )}
        </div>

        {/* Industry */}
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Industry</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {INDUSTRY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIndustry(option)}
                aria-pressed={industry === option}
                className="chip flex flex-col items-start gap-1 px-3.5 py-3 text-left"
              >
                <span className="text-sm font-semibold">{option}</span>
                <span
                  className="text-[11px] leading-snug"
                  style={{
                    color: industry === option ? "var(--accent-ink)" : "var(--ink-3)",
                    opacity: industry === option ? 0.85 : 1,
                  }}
                >
                  {INDUSTRY_BLURB[option]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Founder background */}
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Founder background</span>
          <div className="flex flex-wrap gap-2">
            {FOUNDER_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFounderType(option.value)}
                aria-pressed={founderType === option.value}
                className="chip px-3.5 py-2 text-sm font-medium"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modifier summary */}
        {founderType && (
          <div
            className="anim-fade-up rounded-xl p-4"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {FOUNDER_TYPE_OPTIONS.find((o) => o.value === founderType)?.label} traits
              </h2>
              <span className="eyebrow">Whole playthrough</span>
            </div>
            <ul className="mt-3 flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {modifierSummary.map((line) => (
                <li key={line.label} className="flex items-center justify-between gap-4 py-1.5 text-sm">
                  <span style={{ color: "var(--ink-2)" }}>{line.label}</span>
                  <span className={`pill ${line.isPositive ? "pill-good" : "pill-crit"}`}>
                    {line.isPositive ? "▲" : "▼"} {line.percentText}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!startEnabled}
        onClick={handleStart}
        className="btn btn-primary w-full px-4 py-3.5 text-sm"
      >
        Launch company →
      </button>
    </div>
  );
}
