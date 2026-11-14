/** Tolerant view of the build-time NASA DONKI snapshot. Never fetches NASA. */

export type DonkiType = "SEP" | "FLR" | "CME" | "GST";

export interface SpaceWeatherSource {
  id: string | null;
  type: string | null;
  source: string | null;
  endpoint: string | null;
  doc_url: string | null;
  retrieved_at: string | null;
  sha256: string | null;
  rows_raw: number | null;
  license: string | null;
  snapshot: string | null;
  mode: string | null;
  api_key_sent: boolean | null;
  note: string | null;
}

export interface SpaceWeatherEvent {
  id: string;
  type: string;
  time: string;
  catalog: string | null;
  link: string | null;
  class: string | null;
  peak: string | null;
  end: string | null;
  location: string | null;
  instruments: string[];
  speed_km_s: number | null;
  half_angle_deg: number | null;
  max_kp: number | null;
}

export interface NoaaContext {
  status: string;
  source: string | null;
  source_url: string | null;
  retrieved_at: string | null;
  window_start: string | null;
  window_end: string | null;
  s_scale_max: number | null;
  s_scale_now: number | null;
  note: string | null;
  reason: string | null;
}

export interface SpaceWeather {
  status: string;
  label: string;
  generated_at: string | null;
  window_start: string | null;
  window_end: string | null;
  source: string | null;
  doc_url: string | null;
  reference_url: string | null;
  license: string | null;
  sources: SpaceWeatherSource[];
  counts: Record<string, number>;
  events: SpaceWeatherEvent[];
  failures: { type: string; status: string; retrieved_at: string | null; error: string }[];
  noaa: NoaaContext | null;
  limitations: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function parseSource(value: unknown): SpaceWeatherSource | null {
  if (!isRecord(value)) return null;
  return {
    id: text(value.id),
    type: text(value.type),
    source: text(value.source),
    endpoint: text(value.endpoint),
    doc_url: text(value.doc_url),
    retrieved_at: text(value.retrieved_at),
    sha256: text(value.sha256),
    rows_raw: count(value.rows_raw),
    license: text(value.license),
    snapshot: text(value.snapshot),
    mode: text(value.mode),
    api_key_sent: typeof value.api_key_sent === "boolean" ? value.api_key_sent : null,
    note: text(value.note),
  };
}

function parseEvent(value: unknown): SpaceWeatherEvent | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const type = text(value.type);
  const time = text(value.time);
  if (!id || !type || !time) return null;
  return {
    id,
    type,
    time,
    catalog: text(value.catalog),
    link: text(value.link),
    class: text(value.class),
    peak: text(value.peak),
    end: text(value.end),
    location: text(value.location),
    instruments: strings(value.instruments),
    speed_km_s: count(value.speed_km_s),
    half_angle_deg: count(value.half_angle_deg),
    max_kp: count(value.max_kp),
  };
}

function parseNoaa(value: unknown): NoaaContext | null {
  if (!isRecord(value)) return null;
  const window = isRecord(value.window) ? value.window : {};
  return {
    status: text(value.status) ?? "unavailable",
    source: text(value.source),
    source_url: text(value.source_url),
    retrieved_at: text(value.retrieved_at),
    window_start: text(window.start),
    window_end: text(window.end),
    s_scale_max: count(value.s_scale_max),
    s_scale_now: count(value.s_scale_now),
    note: text(value.note),
    reason: text(value.reason),
  };
}

export function parseSpaceWeather(value: unknown): SpaceWeather | null {
  if (!isRecord(value) || !Array.isArray(value.events) || !Array.isArray(value.sources)) {
    return null;
  }
  const window = isRecord(value.window) ? value.window : {};
  const counts: Record<string, number> = {};
  if (isRecord(value.counts)) {
    for (const [key, raw] of Object.entries(value.counts)) {
      const parsed = count(raw);
      if (parsed !== null) counts[key] = parsed;
    }
  }
  return {
    status: text(value.status) ?? "unavailable",
    label: text(value.label) ?? "unavailable",
    generated_at: text(value.generated_at),
    window_start: text(window.start),
    window_end: text(window.end),
    source: text(value.source),
    doc_url: text(value.doc_url),
    reference_url: text(value.reference_url),
    license: text(value.license),
    sources: value.sources.map(parseSource).filter((item): item is SpaceWeatherSource => item !== null),
    counts,
    events: value.events.map(parseEvent).filter((item): item is SpaceWeatherEvent => item !== null),
    failures: Array.isArray(value.failures)
      ? value.failures
          .filter(isRecord)
          .map((item) => ({
            type: text(item.type) ?? "unknown",
            status: text(item.status) ?? "failed",
            retrieved_at: text(item.retrieved_at),
            error: text(item.error) ?? "snapshot unavailable",
          }))
      : [],
    noaa: parseNoaa(value.noaa_context),
    limitations: strings(value.limitations),
  };
}

const EVENT_LABELS: Record<string, string> = {
  SEP: "Solar energetic particles",
  FLR: "Solar flare",
  CME: "Coronal mass ejection",
  GST: "Geomagnetic storm",
};

export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type;
}

export function eventDetails(event: SpaceWeatherEvent): string[] {
  const details: string[] = [];
  if (event.class) details.push(`Class ${event.class}`);
  if (event.location) details.push(event.location);
  if (event.speed_km_s !== null) details.push(`${Math.round(event.speed_km_s)} km/s`);
  if (event.half_angle_deg !== null) details.push(`half-angle ${Math.round(event.half_angle_deg)}°`);
  if (event.max_kp !== null) details.push(`max Kp ${event.max_kp}`);
  if (event.instruments.length > 0) details.push(event.instruments.join(", "));
  return details;
}
