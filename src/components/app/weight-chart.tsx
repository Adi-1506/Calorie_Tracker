import type { WeightPoint } from "@/lib/nutrition/trend";

const W = 420;
const H = 200;
const PAD = { top: 14, right: 12, bottom: 30, left: 44 };

/**
 * Daily weigh-ins as dots and the 7-day trend as a line. Server-rendered SVG;
 * the list under the chart carries the same numbers for screen readers.
 */
export function WeightChart({ points, trend, summary }: { points: WeightPoint[]; trend: WeightPoint[]; summary: string }) {
  if (points.length < 2) return null;
  const dates = points.map((p) => Date.parse(p.date));
  const minX = Math.min(...dates);
  const maxX = Math.max(...dates);
  const values = [...points, ...trend].map((p) => p.kg);
  const lo = Math.floor(Math.min(...values) - 0.5);
  const hi = Math.ceil(Math.max(...values) + 0.5);
  const x = (d: string) => PAD.left + ((Date.parse(d) - minX) / Math.max(maxX - minX, 1)) * (W - PAD.left - PAD.right);
  const y = (kg: number) => PAD.top + ((hi - kg) / Math.max(hi - lo, 1)) * (H - PAD.top - PAD.bottom);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = trend.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const fmt = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={summary}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted font-mono text-[13px]">
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </text>
        </g>
      ))}
      <text x={PAD.left} y={H - 8} className="fill-muted text-[13px]">
        {fmt(points[0].date)}
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-muted text-[13px]">
        {fmt(points[points.length - 1].date)}
      </text>
      {points.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r="4.5" className="fill-surface stroke-ink" strokeWidth="2" />
      ))}
      <path d={path} fill="none" stroke="var(--turmeric)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
