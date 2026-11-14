/**
 * Parser for `public/data/radiation.json` (A5 snapshot contract).
 *
 * The file is produced by `scripts/fetch_noaa.py`: a real NOAA SWPC GOES proton
 * snapshot with a checksum in `data/snapshots/manifest.json`, or a clearly
 * labelled SYNTHETIC replay when the network is unavailable. The UI renders the
 * published values and never estimates a dose on its own.
 *
 * Two rules this parser enforces instead of papering over:
 *  - a `label` that contradicts the `synthetic` flag is not trusted: it becomes
 *    `unverified` and the view says why;
 *  - a sample without `s_scale` stays UNKNOWN. The S-scale is never inferred
 *    from flux here, and a missing level is never displayed as S0.
 */

export interface RadiationPoint {
  ts: string;
  /** Integral proton flux for the published channel, in the recorded units. */
  flux: number;
  /** NOAA S-scale level at this sample, when the snapshot records one. */
  sScale?: number;
}

export interface RadiationPanel {
  /** True only when the resolved label is `synthetic`. */
  synthetic: boolean;
  label: string;
  /** Set when `label` and the `synthetic` flag disagree. */
  labelConflict?: string;
  source: string;
  sourceUrl?: string;
  retrievedAt?: string;
  license?: string;
  channel?: string;
  satellite?: number;
  units?: string;
  /** True when the recorded units match the pfu contract this view renders. */
  unitsContracted: boolean;
  points: RadiationPoint[];
  current?: RadiationPoint;
  peak?: RadiationPoint;
  sScaleNow?: number;
  sScaleMax?: number;
  thresholds: { name: string; pfu: number }[];
  why?: string;
  note?: string;
}

const LABELS = ["real-public", "proxy", "synthetic"] as const;
const S_ORDER = ["S1", "S2", "S3", "S4", "S5"];

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function scale(value: unknown): number | undefined {
  const level = num(value);
  return level !== undefined && Number.isInteger(level) && level >= 0 && level <= 5 ? level : undefined;
}

/** Rejects unparseable timestamps so a bad sample cannot stretch the time axis. */
function timestamp(value: unknown): string | undefined {
  const ts = str(value);
  if (!ts) return undefined;
  return Number.isNaN(Date.parse(ts)) ? undefined : ts;
}

function point(value: unknown): RadiationPoint | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const ts = timestamp(raw.ts);
  const flux = num(raw.flux);
  // Negative or non-finite flux is not a physical measurement for this channel.
  if (!ts || flux === undefined || flux < 0) return null;
  const sScale = scale(raw.s_scale);
  return { ts, flux, ...(sScale === undefined ? {} : { sScale }) };
}

function thresholds(value: unknown): { name: string; pfu: number }[] {
  if (typeof value !== "object" || value === null) return [];
  const raw = value as Record<string, unknown>;
  return S_ORDER.flatMap((name) => {
    const pfu = num(raw[name]);
    return pfu === undefined || pfu <= 0 ? [] : [{ name, pfu }];
  });
}

interface ResolvedLabel {
  label: string;
  synthetic: boolean;
  conflict?: string;
}

function resolveLabel(doc: Record<string, unknown>): ResolvedLabel {
  const declared = str(doc.label);
  const flag = doc.synthetic === true;
  const known =
    declared && (LABELS as readonly string[]).includes(declared) ? declared : undefined;

  if (!known) {
    return flag
      ? { label: "synthetic", synthetic: true }
      : { label: "unverified", synthetic: false, conflict: "no recognised label" };
  }
  if (known === "synthetic" && !flag) {
    return {
      label: "unverified",
      synthetic: false,
      conflict: "label says synthetic but the synthetic flag is false",
    };
  }
  if (known === "real-public" && flag) {
    return {
      label: "unverified",
      synthetic: false,
      conflict: "label says real-public but the synthetic flag is true",
    };
  }
  return { label: known, synthetic: known === "synthetic" };
}

export function parseRadiation(raw: unknown): RadiationPanel | null {
  if (typeof raw !== "object" || raw === null) return null;
  const doc = raw as Record<string, unknown>;
  const points = Array.isArray(doc.points)
    ? doc.points.map(point).filter((item): item is RadiationPoint => item !== null)
    : [];
  const source = str(doc.source);
  // A panel without points or without a named source cannot be shown honestly.
  if (points.length === 0 || !source) return null;

  const resolved = resolveLabel(doc);
  const units = str(doc.units);
  return {
    synthetic: resolved.synthetic,
    label: resolved.label,
    labelConflict: resolved.conflict,
    source,
    sourceUrl: str(doc.source_url),
    retrievedAt: timestamp(doc.retrieved_at),
    license: str(doc.license),
    channel: str(doc.channel),
    satellite: num(doc.satellite),
    units,
    unitsContracted: /^pfu\b/i.test(units ?? "") && /^(?:>=|≥)\s*10\s*MeV$/i.test(str(doc.channel) ?? ""),
    points,
    current: point(doc.current) ?? points[points.length - 1],
    peak: point(doc.peak) ?? points.reduce((a, b) => (b.flux > a.flux ? b : a), points[0]!),
    sScaleNow: scale(doc.s_scale_now),
    sScaleMax: scale(doc.s_scale_max),
    thresholds: thresholds(doc.thresholds_pfu),
    why: str(doc.why),
    note: str(doc.note),
  };
}

/** "$0.201 pfu" without inventing precision the snapshot does not have. */
export function formatFlux(value: number, unit = "pfu"): string {
  if (value >= 100) return `${value.toFixed(0)} ${unit}`;
  if (value >= 1) return `${value.toFixed(2)} ${unit}`;
  return `${value.toFixed(3)} ${unit}`;
}

export function formatTs(ts: string): string {
  // "2026-11-14T14:30:00Z" -> "14 Nov 2026 14:30 UTC" without a date library.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(ts);
  if (!match) return ts;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, year, month, day, hour, minute] = match;
  return `${Number(day)} ${months[Number(month) - 1] ?? month} ${year} ${hour}:${minute} UTC`;
}

/**
 * NOAA S-scale label. `undefined` means the snapshot did not record a level:
 * that is UNKNOWN, not S0 (S0 is a recorded level below the S1 threshold).
 */
export function sScaleLabel(level: number | undefined): string {
  return level === undefined ? "unknown" : `S${level}`;
}
