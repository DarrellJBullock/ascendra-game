// Ascendra brand mark. Uses the real logo assets in /public:
//   - logo-mark.png   : the icon (ascending bars + arrow) only
//   - logo-lockup.png : the full logo including the "Ascendra" wordtype
// Both have transparent backgrounds so they sit on light and dark surfaces.
//
// `variant="mark"` (default) renders the icon beside an "Ascendra" wordtype —
// good for the compact dashboard top bar. `variant="lockup"` renders the full
// logo image alone (it already contains the name) — good for hero placements.
//
// NOTE: width is set EXPLICITLY (from each asset's real aspect ratio), not
// "auto". An <img> with width:auto inside a flex-column (default
// align-items:stretch) gets stretched to the container width — distorting it.
// A concrete width can't be stretched, so aspect ratio is always preserved.

const LOCKUP_ASPECT = 900 / 614; // logo-lockup.png intrinsic size
const MARK_ASPECT = 588 / 443; // logo-mark.png intrinsic size

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
    const width = Math.round(height * LOCKUP_ASPECT);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo-lockup.png"
        alt="Ascendra"
        width={width}
        height={height}
        style={{ width, height }}
        className={className}
      />
    );
  }

  const markWidth = Math.round(height * MARK_ASPECT);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt=""
        width={markWidth}
        height={height}
        style={{ width: markWidth, height }}
      />
      <span
        className="font-semibold tracking-tight"
        style={{ color: "var(--ink)", fontSize: Math.round(height * 0.62) }}
      >
        Ascendra
      </span>
    </span>
  );
}
