/** Small, dependency-free formatting helpers. They never compute health values. */

export function numOr(value: number | null | undefined, fallback = "—"): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;
}

export function fmt(value: number | null | undefined, decimals = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

/** Cited rule bounds (60, 5000) read best as written; keep decimals only when real. */
export function fmtRule(value: number, decimals = 1): string {
  return Number.isInteger(value) ? String(value) : fmt(value, decimals);
}

export function fmtSigned(value: number | null | undefined, decimals = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

export function fmtRange(
  range: [number, number] | null | undefined,
  decimals = 1,
): string {
  if (!range || range.length !== 2) return "—";
  return `${fmt(range[0], decimals)}–${fmt(range[1], decimals)}`;
}

/** "32 min" / "11 min 20 s" / "45 s" — delay-aware, never over-precise. */
export function fmtDelay(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (secs === 0) return `${mins} min`;
  if (mins < 2) return `${mins} min ${secs} s`;
  return `${mins} min`;
}

/** mm:ss countdown clock. */
export function fmtClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtDay(day: number): string {
  return `Day ${day}`;
}

/** Display-only unit label; the engine's unit string is never rewritten. */
export function unitLabel(unit: string | null | undefined): string {
  if (!unit) return "";
  return unit === "C" ? "°C" : unit;
}

/** "hidden_in_range" -> "Hidden in range" */
export function humanise(value: string | null | undefined): string {
  if (!value) return "—";
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function titleFromName(name: string): string {
  const map: Record<string, string> = {
    cmo_fever: "Crew medical officer: fever",
    sep_sleep_loss: "Sleep loss before a spacewalk",
    co2_creep: "CO₂ creep in the cabin",
  };
  return map[name] ?? humanise(name);
}
