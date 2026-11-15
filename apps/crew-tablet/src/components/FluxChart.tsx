import { isRecord } from "../lib/inspect";

export function FluxChart({ points }: { points: unknown[] }) {
  const usable = points.filter(isRecord).filter((p) => typeof p.flux === "number" && Number.isFinite(p.flux));
  if (!usable.length) return <p className="muted">No flux readings in this snapshot.</p>;
  const values = usable.map((p) => p.flux as number);
  const high = Math.max(...values) * 1.15 || 1;
  const w = 900, h = 230, left = 54, top = 15, bottom = 32;
  const x = (i: number) => left + i / Math.max(1, usable.length - 1) * (w - left - 20);
  const y = (v: number) => top + (1 - v / high) * (h - top - bottom);
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const time = (value: unknown) => typeof value === "string" ? `${value.slice(11, 16)} UTC` : "";
  return <figure className="flux-chart">
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Archived proton flux: ${usable.length} readings, minimum ${Math.min(...values)} and maximum ${Math.max(...values)} pfu. Not live telemetry.`}>
      {[0, .25, .5, .75, 1].map((f) => <g key={f}><line x1={left} x2={w - 20} y1={y(high * f)} y2={y(high * f)} className="grid-line" /><text x={left - 10} y={y(high * f) + 4} textAnchor="end" className="axis-text">{(high * f).toFixed(2)}</text></g>)}
      <polygon points={`${left},${y(0)} ${line} ${x(values.length - 1)},${y(0)}`} fill="var(--accent-soft)" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="1.8" pathLength={1} className="chart-stroke" />
      <text x={left} y={h - 5} className="axis-text">{time(usable[0]?.ts)}</text><text x={w - 20} y={h - 5} textAnchor="end" className="axis-text">{time(usable.at(-1)?.ts)}</text>
    </svg>
    <figcaption className="small muted">≥10 MeV integral protons · pfu · {usable.length} archived readings. This chart shows flux, not absorbed dose.</figcaption>
  </figure>;
}
