// Ascendra brand mark. Uses the real logo assets in /public:
//   - logo-mark.png   : the icon (ascending bars + arrow) only
//   - logo-lockup.png : the full logo including the "Ascendra" wordtype
// Both have transparent backgrounds so they sit on light and dark surfaces.
//
// `variant="mark"` (default) renders the icon beside an "Ascendra" wordtype —
// good for the compact dashboard top bar. `variant="lockup"` renders the full
// logo image alone (it already contains the name) — good for hero placements
// like the creation and end screens. `height` is the rendered image height in
// px; width scales to keep the aspect ratio.

export function Wordmark({
  variant = "mark",
  height = 26,
  className = "",
}: {
  variant?: "mark" | "lockup";
  height?: number;
  className?: string;
}) {
  if (variant === "lockup") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo-lockup.png"
        alt="Ascendra"
        height={height}
        style={{ height, width: "auto" }}
        className={className}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" height={height} style={{ height, width: "auto" }} />
      <span
        className="font-semibold tracking-tight"
        style={{ color: "var(--ink)", fontSize: Math.round(height * 0.62) }}
      >
        Ascendra
      </span>
    </span>
  );
}
