import type { Reading } from "./types";

/** The visualization uses the selected synthetic scenario reading, never a default. */
export function scenarioHeartRate(reading: Reading | undefined): number | null {
  return reading && typeof reading.unit === "string" && reading.unit.toLowerCase() === "bpm" && Number.isFinite(reading.value) && reading.value > 0
    ? reading.value : null;
}

/** Stylized two-part contraction, repeating once per recorded beat. */
export function heartScale(organ: string, bpm: number | null, seconds: number, reducedMotion: boolean): number {
  if (organ.trim().toLowerCase() !== "heart" || bpm === null || !Number.isFinite(bpm) || bpm <= 0 || reducedMotion) return 1;
  const phase = ((seconds * bpm / 60) % 1 + 1) % 1;
  const pulse = Math.exp(-(((phase - 0.10) / 0.065) ** 2)) + 0.42 * Math.exp(-(((phase - 0.27) / 0.055) ** 2));
  return 1 - 0.035 * pulse;
}
