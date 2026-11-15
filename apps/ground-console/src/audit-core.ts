import type { AuditApi, AuditBody, AuditEntry } from "./audit-types";

/** Browser twin of the Python engine's canonical, SHA-256 chained audit log. */
const GENESIS = "0".repeat(64);
const encoder = new TextEncoder();

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) result[key] = sortValue(input[key]);
    return result;
  }
  return value;
}

function canonicalJson(value: unknown): string {
  const compact = JSON.stringify(sortValue(value));
  if (compact === undefined) throw new TypeError("Audit payload must be JSON serializable");
  return compact.replace(/[\u007f-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function appendEntry(entries: readonly AuditEntry[], input: {event: unknown; payload?: unknown; ts?: number | null}): Promise<AuditEntry> {
  const prev = entries.length ? entries[entries.length - 1]!.hash : GENESIS;
  const body: AuditBody = {idx: entries.length, ts: input.ts == null ? Date.now() : Math.trunc(input.ts), event: String(input.event), payload: input.payload ?? {}};
  return {...body, prev, hash: await sha256Hex(prev + canonicalJson(body))};
}

async function verifyChain(entries: readonly AuditEntry[]) {
  let prev = GENESIS;
  for (const entry of entries) {
    const body: AuditBody = {idx: entry.idx, ts: entry.ts, event: entry.event, payload: entry.payload};
    const expected = await sha256Hex(prev + canonicalJson(body));
    if (entry.prev !== prev || entry.hash !== expected) return {ok:false, firstBadIndex:entry.idx, reason:entry.prev !== prev ? "broken link" : "hash mismatch"};
    prev = entry.hash;
  }
  return {ok:true, firstBadIndex:null, reason:null};
}

function renderChainRows(tbody: HTMLTableSectionElement, entries: readonly AuditEntry[], badIndex: number | null): void {
  tbody.replaceChildren();
  for (const entry of entries) {
    const row = document.createElement("tr");
    if (entry.idx === badIndex) row.className = "is-tampered";
    for (const value of [entry.idx, entry.event, entry.ts, `${entry.hash.slice(0,12)}…`]) {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.append(cell);
    }
    tbody.append(row);
  }
}

const api: AuditApi = {GENESIS, canonicalJson, sha256Hex, appendEntry, verifyChain, renderChainRows};
(globalThis as typeof globalThis & {LightminuteAudit: AuditApi}).LightminuteAudit = api;
