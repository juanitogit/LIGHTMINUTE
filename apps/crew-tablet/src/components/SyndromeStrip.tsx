import { fmt } from "../lib/format";

export const SYNDROME_ALERT_Z = 2.33;

const W = 560;
const H = 118;
const PAD = { left: 34, right: 14, top: 16, bottom: 22 };

export function SyndromeStrip({
  series,
  selectedDay,
}: {
  series: { day: number; z: number }[];
  selectedDay: number;
}) {
  const usable = series.filter((p) => Number.isFinite(p.z));
  if (usable.length === 0) {
    return <p className="chart-empty">No syndrome score for this crew yet.</p>;
  }

  const max = Math.max(SYNDROME_ALERT_Z + 0.6, ...usable.map((p) => p.z));
  const min = Math.min(-1, ...usable.map((p) => p.z));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = usable.length > 1 ? plotW / (usable.length - 1) : 0;
  const x = (index: number) => PAD.left + (usable.length > 1 ? index * step : plotW / 2);
  const y = (z: number) => PAD.top + plotH - ((z - min) / (max - min)) * plotH;

  const selectedIndexRaw = usable.findIndex((p) => p.day === selectedDay);
  const selectedIndex = selectedIndexRaw >= 0 ? selectedIndexRaw : usable.length - 1;
  const selected = usable[selectedIndex];
  const above = (selected?.z ?? 0) >= SYNDROME_ALERT_Z;

  const line = usable.map((p, i) => `${x(i)},${y(p.z)}`).join(" ");
  const area = `${PAD.left},${y(min)} ${line} ${x(usable.length - 1)},${y(min)}`;

  return (
    <figure className="syndrome">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="syndrome__svg"
        role="img"
        aria-label={`Combined syndrome score z ${fmt(selected?.z, 1)} on day ${
          selected?.day ?? selectedDay
        }; alert line ${SYNDROME_ALERT_Z}.`}
      >
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(SYNDROME_ALERT_Z)}
          y2={y(SYNDROME_ALERT_Z)}
          className="alert-line"
        />
        <text x={W - PAD.right} y={y(SYNDROME_ALERT_Z) - 5} textAnchor="end" className="alert-text">
          alert {SYNDROME_ALERT_Z.toFixed(2)}
        </text>
        <text x={PAD.left - 6} y={y(0) + 3.5} textAnchor="end" className="axis-text">
          0
        </text>
        <polyline points={area} className="syndrome-area" />
        <polyline key={`${selectedDay}-${line}`} points={line} pathLength={1} className="syndrome-line chart-stroke" />
        {selected ? (
          <circle
            cx={x(selectedIndex)}
            cy={y(selected.z)}
            r="4.5"
            className={above ? "syndrome-dot syndrome-dot--alert" : "syndrome-dot"}
          />
        ) : null}
      </svg>
      <figcaption className="syndrome__cap">
        <span>
          Combined score <b>z = {fmt(selected?.z, 2)}</b>
        </span>
        <span className={above ? "state state--act" : "state state--ok"}>
          {above ? "above the alert line" : "below the alert line"}
        </span>
        <span className="muted">4 signals moving together · alert line is a demo parameter</span>
      </figcaption>
    </figure>
  );
}
