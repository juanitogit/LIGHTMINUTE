import { useId, useMemo } from "react";
import { earthRangeText, type EarthRuleView } from "../lib/earth";
import { fmt } from "../lib/format";
import type { IndicatorMeta } from "../lib/meta";
import type { Reading } from "../lib/types";
import { AnimatedPolyline } from "./AnimatedPolyline";

const W = 560;
const H = 210;
const PAD = { left: 46, right: 16, top: 18, bottom: 28 };

export interface BandPoint {
  day: number;
  reading?: Reading;
}

interface Range {
  min: number;
  max: number;
}

function paddedRange(values: number[]): Range {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 1 };
  const nonNegative = finite.every((v) => v >= 0);
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  const lower = nonNegative ? Math.max(0, min - pad) : min - pad;
  return { min: lower, max: max + pad };
}

export function BandChart({
  points,
  selectedDay,
  meta,
  earth,
}: {
  points: BandPoint[];
  selectedDay: number;
  meta: IndicatorMeta;
  earth?: EarthRuleView | null;
}) {
  const gradientId = useId().replace(/:/g, "");

  const chart = useMemo(() => {
    const usable = points.filter(
      (p): p is { day: number; reading: Reading } =>
        Boolean(p.reading) && Number.isFinite(p.reading?.value),
    );
    const values: number[] = [];
    for (const p of usable) {
      values.push(p.reading.value);
      const band = p.reading.ci95;
      if (band && band.length === 2) values.push(band[0], band[1]);
    }
    if (earth) {
      if (earth.low !== null) values.push(earth.low);
      if (earth.high !== null) values.push(earth.high);
    }
    const range = paddedRange(values);

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const step = usable.length > 1 ? plotW / (usable.length - 1) : 0;
    const x = (index: number) => PAD.left + (usable.length > 1 ? index * step : plotW / 2);
    const y = (value: number) =>
      PAD.top + plotH - ((value - range.min) / (range.max - range.min)) * plotH;

    const indexOfSelected = Math.max(
      0,
      usable.findIndex((p) => p.day === selectedDay),
    );

    const bandTop = usable
      .map((p, i) =>
        p.reading.ci95
          ? `${x(i)},${y(Math.max(p.reading.ci95[0], p.reading.ci95[1]))}`
          : null,
      )
      .filter((v): v is string => v !== null);
    const bandBottom = usable
      .map((p, i) =>
        p.reading.ci95
          ? `${x(i)},${y(Math.min(p.reading.ci95[0], p.reading.ci95[1]))}`
          : null,
      )
      .filter((v): v is string => v !== null)
      .reverse();

    const valueLine = usable.map((p, i) => `${x(i)},${y(p.reading.value)}`).join(" ");
    const selected = usable[indexOfSelected] ?? usable[usable.length - 1];
    const selectedIndex = selected ? usable.indexOf(selected) : 0;
    const baseline = [...usable].reverse().find((p) => Number.isFinite(p.reading.baseline))
      ?.reading.baseline;

    return {
      usable,
      range,
      x,
      y,
      bandPolygon: bandTop.length > 1 ? [...bandTop, ...bandBottom].join(" ") : "",
      valueLine,
      selected,
      selectedX: x(selectedIndex),
      baseline,
      indexOfSelected,
    };
  }, [points, selectedDay, earth]);

  const { usable, range, y, bandPolygon, valueLine, selected, selectedX, baseline } = chart;
  const decimals = meta.decimals;

  if (usable.length === 0) {
    return (
      <p className="chart-empty" role="status">
        No {meta.label.toLowerCase()} readings yet in this scenario.
      </p>
    );
  }

  const selectedReading = selected?.reading;
  const summary = selectedReading
    ? `${meta.label}: ${fmt(selectedReading.value, decimals)} ${meta.unit} on day ${
        selected?.day
      }, personal 95% band ${selectedReading.ci95 ? fmt(selectedReading.ci95[0], decimals) : "—"} to ${
        selectedReading.ci95 ? fmt(selectedReading.ci95[1], decimals) : "—"
      } ${meta.unit}.`
    : "";

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart__svg"
        role="img"
        aria-label={summary}
      >
        <defs>
          <linearGradient id={`band-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const value = range.min + (range.max - range.min) * (1 - t);
          const yy = PAD.top + (H - PAD.top - PAD.bottom) * t;
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yy}
                y2={yy}
                className="grid-line"
              />
              <text x={PAD.left - 8} y={yy + 3.5} textAnchor="end" className="axis-text">
                {fmt(value, decimals)}
              </text>
            </g>
          );
        })}

        {earth ? (
          <g>
            {earth.low !== null && earth.high !== null ? (
              <rect
                x={PAD.left}
                y={y(Math.max(earth.low, earth.high))}
                width={W - PAD.left - PAD.right}
                height={Math.abs(y(Math.min(earth.low, earth.high)) - y(Math.max(earth.low, earth.high)))}
                className="earth-band"
              />
            ) : null}
            {[earth.low, earth.high].map((value) =>
              value !== null ? (
                <line
                  key={value}
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(value)}
                  y2={y(value)}
                  className="earth-line"
                />
              ) : null,
            )}
            <text
              x={PAD.left + 6}
              y={y(earth.high ?? earth.low ?? range.max) - 5}
              className="earth-text"
            >
              Earth {earthRangeText(earth, meta.unit, decimals)}
              {earth.status === "demo-parameter" ? " · demo" : ""}
            </text>
          </g>
        ) : null}

        {bandPolygon ? (
          <polygon points={bandPolygon} fill={`url(#band-${gradientId})`} />
        ) : null}

        {typeof baseline === "number" ? (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(baseline)}
            y2={y(baseline)}
            className="baseline"
          />
        ) : null}

        <AnimatedPolyline points={valueLine} className="value-line chart-continuous" />

        <line
          x1={selectedX}
          x2={selectedX}
          y1={PAD.top}
          y2={H - PAD.bottom}
          className="today-guide"
        />

        {selectedReading ? (
          <g>
            <circle cx={selectedX} cy={y(selectedReading.value)} r="9" className="today-halo" />
            <circle cx={selectedX} cy={y(selectedReading.value)} r="4.5" className="today-dot" />
          </g>
        ) : null}

        <text x={PAD.left} y={H - 8} className="axis-text">
          day {usable[0]?.day ?? ""}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" className="axis-text">
          day {usable[usable.length - 1]?.day ?? ""}
        </text>
      </svg>
      <figcaption className="chart__legend">
        <span><span className="swatch swatch--band" /> your 95% band</span>
        <span><span className="swatch swatch--line" /> daily value</span>
        {typeof baseline === "number" ? (
          <span><span className="swatch swatch--dash" /> baseline</span>
        ) : null}
        {earth ? (
          <span>
            <span className="swatch swatch--earth" /> Earth rule · {earth.status}
          </span>
        ) : (
          <span className="muted">Earth reference range is not shown on this chart — personal lens only.</span>
        )}
      </figcaption>
    </figure>
  );
}
