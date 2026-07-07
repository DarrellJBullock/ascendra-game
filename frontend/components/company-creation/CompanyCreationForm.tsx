"use client";

// Client Component: this screen is entirely interactive (text input, radio
// selections, local validation state, and a store-mutating confirm action),
// so it cannot be a Server Component.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useGameStore } from "@/src/game/store";
import type { FounderType, Industry } from "@/src/game/types";
import {
  FOUNDER_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  isStartEnabled,
  validateCompanyName,
} from "./validation";
import { getFounderModifierSummary } from "./founderModifierSummary";

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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Found your company</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Name your company, pick an industry, and choose a founder
          background. These choices shape your playthrough from Week 1.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="company-name" className="text-sm font-medium">
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
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {touchedName && !nameValidation.valid && (
          <p className="text-sm text-red-600">{nameValidation.error}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Industry</span>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setIndustry(option)}
              aria-pressed={industry === option}
              className={`rounded-md border px-4 py-2 text-sm ${
                industry === option
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Founder background</span>
        <div className="flex flex-wrap gap-2">
          {FOUNDER_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFounderType(option.value)}
              aria-pressed={founderType === option.value}
              className={`rounded-md border px-4 py-2 text-sm ${
                founderType === option.value
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {founderType && (
        <div className="rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold">
            {FOUNDER_TYPE_OPTIONS.find((o) => o.value === founderType)?.label}{" "}
            modifiers
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Applied for the rest of this playthrough. This is why the choice
            matters, not just flavor.
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {modifierSummary.map((line) => (
              <li key={line.label} className="flex justify-between gap-4">
                <span>{line.label}</span>
                <span
                  className={
                    line.isPositive
                      ? "font-medium text-green-700 dark:text-green-400"
                      : "font-medium text-red-700 dark:text-red-400"
                  }
                >
                  {line.percentText}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={!startEnabled}
        onClick={handleStart}
        className="rounded-md bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
      >
        Start
      </button>
    </div>
  );
}
