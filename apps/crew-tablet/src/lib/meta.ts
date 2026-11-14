import type { Level } from "./types";

export const LEVEL_ORDER: Level[] = ["info", "watch", "act", "escalate"];

export const LEVEL_RANK: Record<string, number> = {
  info: 0,
  watch: 1,
  act: 2,
  escalate: 3,
};

export function maxLevel(levels: string[]): Level {
  let best: Level = "info";
  for (const level of levels) {
    if ((LEVEL_RANK[level] ?? 0) > (LEVEL_RANK[best] ?? 0)) best = level as Level;
  }
  return best;
}

export function isLevel(value: string | undefined): value is Level {
  return value === "info" || value === "watch" || value === "act" || value === "escalate";
}

export const LEVEL_COPY: Record<Level, { label: string; short: string; hint: string }> = {
  info: { label: "Routine", short: "Info", hint: "See the personal band" },
  watch: { label: "Watch", short: "Watch", hint: "Worth a closer look today" },
  act: { label: "Act", short: "Act", hint: "Follow the steps on the card" },
  escalate: { label: "Escalate", short: "Escalate", hint: "Escalate to ground and use a protocol" },
};

export interface IndicatorMeta {
  key: string;
  label: string;
  short: string;
  unit: string;
  decimals: number;
  /** One-line, non-diagnostic description of what the signal is. */
  blurb: string;
}

/** Labels only. Ranges, thresholds and verdicts come from the engine payload. */
export const INDICATORS: IndicatorMeta[] = [
  {
    key: "rest_hr",
    label: "Resting heart rate",
    short: "HR",
    unit: "bpm",
    decimals: 1,
    blurb: "Beats per minute after five minutes of rest.",
  },
  {
    key: "temp_c",
    label: "Core temperature",
    short: "Temp",
    unit: "°C",
    decimals: 2,
    blurb: "Oral temperature taken at the same time each day.",
  },
  {
    key: "sleep_h",
    label: "Sleep duration",
    short: "Sleep",
    unit: "h",
    decimals: 1,
    blurb: "Hours slept in the last rest period.",
  },
  {
    key: "pvt_ms",
    label: "Reaction time (PVT)",
    short: "PVT",
    unit: "ms",
    decimals: 0,
    blurb: "Median response time on a 3-minute vigilance test.",
  },
  {
    key: "co2_ppm",
    label: "Cabin CO₂",
    short: "CO₂",
    unit: "ppm",
    decimals: 0,
    blurb: "Carbon dioxide concentration reported by the cabin sensors.",
  },
  {
    key: "headache_score",
    label: "Headache score",
    short: "Headache",
    unit: "0-10",
    decimals: 1,
    blurb: "Crew-reported headache severity on the engine's 0–10 scale.",
  },
];

export function crewRoles(doc: {
  crew?: Record<string, { role?: string; label?: string }>;
  crew_roles?: Record<string, string>;
}): Record<string, string> {
  const roles: Record<string, string> = { ...(doc.crew_roles ?? {}) };
  for (const [id, info] of Object.entries(doc.crew ?? {})) {
    if (info?.role) roles[id] = info.role;
  }
  return roles;
}

export function indicatorMeta(key: string): IndicatorMeta {
  return (
    INDICATORS.find((m) => m.key === key) ?? {
      key,
      label: key.replace(/_/g, " "),
      short: key,
      unit: "",
      decimals: 1,
      blurb: "",
    }
  );
}

/** Where a hazard family sits on the body silhouette. */
export type BodyRegion = "head" | "eyes" | "chest" | "abdomen" | "legs";

export const RISK_REGION: Record<string, BodyRegion> = {
  cardiovascular: "chest",
  immune: "abdomen",
  behavioral: "head",
  vision: "eyes",
  bone: "legs",
  muscular: "legs",
  sensorimotor: "head",
};

export const REGION_RISK: Record<BodyRegion, string> = {
  head: "behavioral",
  eyes: "vision",
  chest: "cardiovascular",
  abdomen: "immune",
  legs: "bone",
};

export const REGION_LABEL: Record<BodyRegion, string> = {
  head: "Behavioral / neuro",
  eyes: "Vision",
  chest: "Cardiovascular",
  abdomen: "Immune",
  legs: "Bone & muscle",
};

export const PATTERN_COPY: Record<string, string> = {
  hidden_in_range:
    "Normal for the population, unusual for you. A fixed Earth range would stay silent here.",
  expected_for_you:
    "Outside the Earth range, but your own baseline already sits there. This is your normal.",
  space_adapted_normal: "Inside the space-adapted reference for this crew.",
  concordant_alert: "Earth and personal lenses point the same way: worth acting on.",
  concordant_normal: "Every lens agrees: nothing unusual today.",
  learning_baseline:
    "Still learning your baseline. The personal lens needs 7 days before it judges.",
  mixed: "The lenses disagree. Treat this as a prompt to look closer, not a verdict.",
};

/** Patterns where the lenses are not telling the same story. */
export const DISAGREEMENT_PATTERNS = new Set([
  "hidden_in_range",
  "expected_for_you",
  "mixed",
]);

export const EARTH_LABEL: Record<string, string> = {
  normal: "Normal",
  low: "Low",
  high: "High",
  no_rule: "No Earth rule",
};

export const SPACE_LABEL: Record<string, string> = {
  no_rule: "No verified rule yet",
  normal: "Normal",
  low: "Low",
  high: "High",
};

export const PERSONAL_LABEL: Record<string, string> = {
  typical: "Typical for you",
  unusual_high: "Unusual for you (high)",
  unusual_low: "Unusual for you (low)",
  learning: "Still learning",
  no_rule: "No personal estimate",
};

export function crewIds(doc: { days: ScenarioDayLike[] }): string[] {
  const first = doc.days[0];
  return first ? Object.keys(first.crew) : ["A", "B", "C", "D"];
}

interface ScenarioDayLike {
  crew: Record<string, unknown>;
}
