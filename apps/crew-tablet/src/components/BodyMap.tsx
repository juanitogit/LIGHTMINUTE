import { useMemo } from "react";
import {
  indicatorMeta,
  LEVEL_COPY,
  LEVEL_RANK,
  REGION_LABEL,
  REGION_RISK,
  RISK_REGION,
  type BodyRegion,
} from "../lib/meta";
import type { Level, Reading } from "../lib/types";

/** Map an engine verdict to a display level. No new thresholds are introduced. */
function personalLevel(verdict: string | undefined): Level {
  if (verdict === "unusual_high" || verdict === "unusual_low") return "act";
  if (verdict === "learning") return "watch";
  return "info";
}

interface RegionState {
  region: BodyRegion;
  level: Level;
  indicatorKey: string;
  verdict: string;
}

const HOTSPOTS: Record<BodyRegion, { cx: number; cy: number; rx: number; ry: number }> = {
  head: { cx: 110, cy: 60, rx: 29, ry: 29 },
  eyes: { cx: 110, cy: 56, rx: 13, ry: 8 },
  chest: { cx: 110, cy: 126, rx: 27, ry: 27 },
  abdomen: { cx: 110, cy: 176, rx: 21, ry: 17 },
  legs: { cx: 110, cy: 286, rx: 32, ry: 48 },
};

const REGIONS: BodyRegion[] = ["head", "eyes", "chest", "abdomen", "legs"];

export function BodyMap({
  readings,
  crewLabel,
  onOpenIndicator,
}: {
  readings: Record<string, Reading>;
  crewLabel: string;
  onOpenIndicator: (indicatorKey: string) => void;
}) {
  const { states, mappedRisks } = useMemo(() => {
    const byRegion = new Map<BodyRegion, RegionState>();
    const mapped = new Set<string>();
    for (const [key, reading] of Object.entries(readings)) {
      const region = RISK_REGION[reading.hrp_risk];
      if (!region) continue;
      mapped.add(reading.hrp_risk);
      const verdict = reading.lens?.personal ?? "no_rule";
      const level = personalLevel(verdict);
      const previous = byRegion.get(region);
      if (!previous || (LEVEL_RANK[level] ?? 0) > (LEVEL_RANK[previous.level] ?? 0)) {
        byRegion.set(region, { region, level, indicatorKey: key, verdict });
      }
    }
    return { states: byRegion, mappedRisks: mapped };
  }, [readings]);

  return (
    <figure className="bodymap">
      <svg
        viewBox="0 0 220 366"
        className="bodymap__svg"
        role="group"
        aria-label={`Hazard map for ${crewLabel}. Each region links to the indicator's why-view.`}
      >
        <defs>
          <pattern id="bodymap-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0H0v22" fill="none" stroke="var(--line)" strokeWidth="0.5" opacity="0.55" />
          </pattern>
          <radialGradient id="bodymap-fade" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="220" height="366" fill="url(#bodymap-grid)" opacity="0.5" />
        <ellipse cx="110" cy="160" rx="108" ry="150" fill="url(#bodymap-fade)" opacity="0.35" />

        {/* Figcaption-free labels keep the silhouette readable instead of decorative. */}
        <text x="8" y="16" className="bodymap__tag">
          HAZARD MAP
        </text>
        <text x="212" y="16" textAnchor="end" className="bodymap__tag">
          {crewLabel.toUpperCase()}
        </text>

        <g className="bodymap__figure" aria-hidden="true">
          <circle cx="110" cy="60" r="22" className="body-fill" />
          <circle cx="103" cy="56" r="2.1" className="body-eye" />
          <circle cx="117" cy="56" r="2.1" className="body-eye" />
          <path d="M110 82v10" className="body-line" />
          <path
            d="M80 99q30-13 60 0l4 70q1 24-17 31H93q-18-7-17-31z"
            className="body-fill"
          />
          <path d="M80 107c-13 15-17 44-15 78" className="body-limb" />
          <path d="M140 107c13 15 17 44 15 78" className="body-limb" />
          <path d="M97 202c-2 34-4 60-5 88l-2 36" className="body-limb body-limb--leg" />
          <path d="M123 202c2 34 4 60 5 88l2 36" className="body-limb body-limb--leg" />
          <path d="M88 328h10M122 328h10" className="body-foot" />
        </g>
        <g className="bodymap__regions">
          {REGIONS.map((region) => {
            const state = states.get(region);
            const spot = HOTSPOTS[region];
            const level = state?.level ?? "info";
            const hasData = Boolean(state);
            const risk = REGION_RISK[region];
            const copy = state ? LEVEL_COPY[state.level] : null;
            const indicator = state ? indicatorMeta(state.indicatorKey) : null;
            const label = `${REGION_LABEL[region]} (${risk}): ${
              state ? (copy?.label ?? "no data") : "no reading today"
            }${indicator ? `. Open ${indicator.label}` : ""}`;

            const content = (
              <>
                <ellipse
                  cx={spot.cx}
                  cy={spot.cy}
                  rx={spot.rx}
                  ry={spot.ry}
                  className={`region-glow region-glow--${hasData ? level : "none"}`}
                  style={{
                    opacity: hasData
                      ? level === "info"
                        ? 0.18
                        : level === "watch"
                          ? 0.36
                          : 0.46
                      : 0.07,
                  }}
                />
                <ellipse
                  cx={spot.cx}
                  cy={spot.cy}
                  rx={spot.rx}
                  ry={spot.ry}
                  className="region-hit"
                />
              </>
            );

            if (!state) {
              return <g key={region} aria-hidden="true">{content}</g>;
            }

            return (
              <g
                key={region}
                className="region"
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={() => onOpenIndicator(state.indicatorKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenIndicator(state.indicatorKey);
                  }
                }}
              >
                <title>{label}</title>
                {content}
              </g>
            );
          })}
        </g>

      </svg>

      <figcaption className="bodymap__cap">
        <div className="bodymap__legend" aria-hidden="true">
          <span className="legend-dot legend-dot--act" /> unusual for you
          <span className="legend-dot legend-dot--watch" /> still learning
          <span className="legend-dot legend-dot--info" /> typical
        </div>
        <p className="bodymap__note">
          Region glow follows the engine&apos;s three-lens verdicts, not a diagnosis.
          {mappedRisks.size > 0 ? (
            <>
              {" "}
              <span className="muted">
                Families on the map today: {Array.from(mappedRisks).join(", ")}.
              </span>
            </>
          ) : null}
        </p>
      </figcaption>
    </figure>
  );
}
