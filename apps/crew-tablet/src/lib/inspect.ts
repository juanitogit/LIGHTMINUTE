/** Tolerant helpers so optional files (radiation, validation) render whatever exists. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    if (Number.isInteger(value)) return value.toLocaleString("en-US");
    if (Math.abs(value) >= 1000) return value.toFixed(0);
    return String(Number(value.toFixed(3)));
  }
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.length > 4
      ? `${value.slice(0, 4).map(formatValue).join(", ")} +${value.length - 4}`
      : value.map(formatValue).join(", ");
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join(" · ");
  }
  return String(value);
}

export function primitiveEntries(
  record: Record<string, unknown>,
  limit = 12,
): [string, string][] {
  return Object.entries(record)
    .filter(([, value]) => value === null || typeof value !== "object")
    .slice(0, limit)
    .map(([key, value]) => [key, formatValue(value)]);
}

export function recordArrays(
  record: Record<string, unknown>,
  limit = 4,
): { key: string; rows: Record<string, unknown>[] }[] {
  const out: { key: string; rows: Record<string, unknown>[] }[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const rows = value.filter(isRecord);
    if (rows.length === 0) continue;
    out.push({ key, rows });
    if (out.length >= limit) break;
  }
  return out;
}

export function stringItems(value: unknown): string[] {
  return asArray(value)
    .map((item) => (typeof item === "string" ? item : isRecord(item) ? formatValue(item) : ""))
    .filter((item) => item.length > 0);
}

export function pickRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}
