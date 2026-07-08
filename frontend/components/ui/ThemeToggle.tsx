"use client";

// Phase 4 — premium dark/light theme toggle. Persists to localStorage and
// stamps data-theme on <html> (which the CSS overrides read). Defaults to the
// system preference until the user picks.

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("ascendra:theme")) as Theme | null;
    setTheme(saved ?? (document.documentElement.dataset.theme as Theme) ?? systemTheme());
  }, []);

  function toggle() {
    const next: Theme = (theme ?? systemTheme()) === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("ascendra:theme", next);
    } catch {
      /* ignore */
    }
  }

  const isDark = (theme ?? systemTheme()) === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="btn btn-ghost h-9 w-9 rounded-full p-0 text-sm"
    >
      <span aria-hidden>{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}
