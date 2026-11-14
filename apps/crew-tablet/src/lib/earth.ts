import { thresholds } from "virtual:tether-thresholds";
import { fmtRule } from "./format";
import type { Reading } from "./types";

export interface EarthRuleView {
  low: number | null;
  high: number | null;
  /** "earth-standard", "demo-parameter", or "scenario-payload". */
  status: string;
  source?: string;
  /** Where the numbers came from, for honest labelling. */
  origin: "payload" | "kb";
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Earth lens numbers, in order of authority:
 *   1. `earth_range` on the reading (A1's export, when present).
 *   2. `kb/thresholds.json`, the same cited rule the engine uses.
 * Everything carries its status/source; nothing is estimated here.
 */
export function earthRule(indicator: string, reading: Reading | undefined): EarthRuleView | null {
  const payload = reading?.earth_range;
  if (payload && payload.length === 2 && payload.every((v) => Number.isFinite(v))) {
    return {
      low: finiteOrNull(payload[0]),
      high: finiteOrNull(payload[1]),
      status: "scenario-payload",
      origin: "payload",
    };
  }

  const entry = thresholds[indicator];
  const earth = entry?.earth;
  if (!entry || !earth) return null;

  const low = finiteOrNull(earth.low);
  const high = finiteOrNull(earth.high);
  if (low === null && high === null) return null;

  return {
    low,
    high,
    status: earth.status ?? "unlabelled",
    source: earth.source,
    origin: "kb",
  };
}

export function earthIsDemoParameter(rule: EarthRuleView | null): boolean {
  return rule?.status === "demo-parameter";
}

/** "60–100 bpm" / "ceiling 5000 ppm" / "floor X" — no invented precision. */
export function earthRangeText(rule: EarthRuleView, unit: string, decimals = 1): string {
  const { low, high } = rule;
  if (low !== null && high !== null) {
    return `${fmtRule(low, decimals)}–${fmtRule(high, decimals)} ${unit}`;
  }
  if (high !== null) return `ceiling ${fmtRule(high, decimals)} ${unit}`;
  if (low !== null) return `floor ${fmtRule(low, decimals)} ${unit}`;
  return "—";
}
