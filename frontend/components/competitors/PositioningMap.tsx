"use client";

// Phase 4 — competitive positioning map. A lightweight SVG quadrant plotting
// each rival + the player on product quality (y) vs. market share (x), bubble
// size ~ funding/valuation. Presentational: takes computed points.

export interface MapPoint {
  id: string;
  name: string;
  share: number; // 0-100 (x)
  quality: number; // 0-100 (y)
  size: number; // funding / valuation (bubble radius)
  isPlayer: boolean;
}

const W = 340;
const H = 220;
const PAD = { l: 30, r: 16, t: 14, b: 26 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

export default function PositioningMap({ points }: { points: MapPoint[] }) {
  if (points.length === 0) return null;
  const maxShare = Math.max(5, ...points.map((p) => p.share));
  const maxSize = Math.max(1, ...points.map((p) => p.size));

  const x = (share: number) => PAD.l + (Math.min(share, maxShare) / maxShare) * plotW;
  const y = (quality: number) => PAD.t + (1 - Math.max(0, Math.min(100, quality)) / 100) * plotH;
  const r = (size: number) => 6 + (size / maxSize) * 10;

  const midX = PAD.l + plotW / 2;
  const midY = PAD.t + plotH / 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }} role="img" aria-label="Competitive positioning map">
        {/* plot frame + quadrant divider */}
        <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} rx={8} fill="var(--surface-2)" stroke="var(--border)" />
        <line x1={midX} y1={PAD.t} x2={midX} y2={PAD.t + plotH} stroke="var(--border)" strokeDasharray="3 4" />
        <line x1={PAD.l} y1={midY} x2={PAD.l + plotW} y2={midY} stroke="var(--border)" strokeDasharray="3 4" />

        {/* quadrant hints */}
        <text x={PAD.l + plotW - 6} y={PAD.t + 14} textAnchor="end" fontSize="9" fill="var(--ink-3)">Leaders</text>
        <text x={PAD.l + 6} y={PAD.t + 14} textAnchor="start" fontSize="9" fill="var(--ink-3)">Specialists</text>
        <text x={PAD.l + plotW - 6} y={PAD.t + plotH - 6} textAnchor="end" fontSize="9" fill="var(--ink-3)">Scalers</text>

        {/* axis labels */}
        <text x={PAD.l + plotW / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--ink-3)">Market share →</text>
        <text x={10} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="9" fill="var(--ink-3)" transform={`rotate(-90 10 ${PAD.t + plotH / 2})`}>Product quality →</text>

        {/* points */}
        {points.map((p) => (
          <g key={p.id}>
            <circle
              cx={x(p.share)}
              cy={y(p.quality)}
              r={r(p.size)}
              fill={p.isPlayer ? "color-mix(in srgb, var(--accent) 75%, transparent)" : "color-mix(in srgb, var(--ink-3) 45%, transparent)"}
              stroke={p.isPlayer ? "var(--accent)" : "var(--border-strong)"}
              strokeWidth={p.isPlayer ? 2 : 1}
            />
            <text
              x={x(p.share)}
              y={y(p.quality) - r(p.size) - 3}
              textAnchor="middle"
              fontSize="9"
              fontWeight={p.isPlayer ? 700 : 500}
              fill={p.isPlayer ? "var(--accent)" : "var(--ink-2)"}
            >
              {p.name.length > 12 ? `${p.name.slice(0, 11)}…` : p.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
