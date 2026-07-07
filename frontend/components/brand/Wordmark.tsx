// Ascendra brand wordmark — a small "ascending bars" glyph + wordtype.
// Pure presentational (no hooks), safe to render anywhere.

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="grid place-items-center rounded-[9px]"
        style={{
          width: 28,
          height: 28,
          background: "linear-gradient(150deg, var(--accent-2), var(--accent))",
          boxShadow:
            "0 6px 16px -8px color-mix(in srgb, var(--accent) 75%, transparent)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1" y="9" width="3" height="5" rx="1" fill="var(--accent-ink)" opacity="0.65" />
          <rect x="6" y="5" width="3" height="9" rx="1" fill="var(--accent-ink)" opacity="0.85" />
          <rect x="11" y="1" width="3" height="13" rx="1" fill="var(--accent-ink)" />
        </svg>
      </span>
      <span
        className="text-[15px] font-semibold tracking-tight"
        style={{ color: "var(--ink)" }}
      >
        Ascendra
      </span>
    </span>
  );
}
