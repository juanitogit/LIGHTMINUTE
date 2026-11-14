/* TETHER audit chain - classic-script build. src/audit.js re-exports it. */
(function (global) {
  "use strict";
/* TETHER audit chain - browser twin of services/engine/tether_engine/audit.py.
 *
 * Same canonical JSON as the engine: sorted keys, compact separators, ASCII-escaped
 * (Python's json.dumps(..., sort_keys=True, separators=(",", ":"))).
 * hash = sha256(prev + canonical({idx, ts, event, payload}))
 *
 * Caveat: JS and Python format floats differently (1.0 vs 1, 0.1+0.2). Use integer
 * timestamps and avoid floats in `payload` if a chain must verify on both sides.
 */

const GENESIS = "0".repeat(64);

const encoder = new TextEncoder();

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortValue(value[key]);
    return out;
  }
  return value;
}

/** Canonical JSON string, byte-compatible with the Python engine for ASCII data. */
function canonicalJson(value) {
  const compact = JSON.stringify(sortValue(value));
  // Python escapes every non-ASCII code point; JSON.stringify leaves most of them raw.
  return compact.replace(/[\u007f-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

async function sha256Hex(text) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Append one entry, returning the new head (immutable; `entries` is not mutated). */
async function appendEntry(entries, { event, payload, ts }) {
  const prev = entries.length ? entries[entries.length - 1].hash : GENESIS;
  const body = {
    idx: entries.length,
    ts: ts == null ? Date.now() : Math.trunc(ts),
    event: String(event),
    payload: payload ?? {},
  };
  const hash = await sha256Hex(prev + canonicalJson(body));
  return { ...body, prev, hash };
}

/** Verify the whole chain; returns the first tampered index (or null). */
async function verifyChain(entries) {
  let prev = GENESIS;
  for (const entry of entries) {
    const body = { idx: entry.idx, ts: entry.ts, event: entry.event, payload: entry.payload };
    const expected = await sha256Hex(prev + canonicalJson(body));
    if (entry.prev !== prev || entry.hash !== expected) {
      return { ok: false, firstBadIndex: entry.idx, reason: entry.prev !== prev ? "broken link" : "hash mismatch" };
    }
    prev = entry.hash;
  }
  return { ok: true, firstBadIndex: null, reason: null };
}

/** Render a chain as an HTML table body (textContent only, no innerHTML). */
function renderChainRows(tbody, entries, badIndex) {
  tbody.replaceChildren();
  for (const entry of entries) {
    const tr = document.createElement("tr");
    if (entry.idx === badIndex) tr.className = "is-tampered";
    for (const value of [entry.idx, entry.event, entry.ts, `${entry.hash.slice(0, 12)}…`]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.append(td);
    }
    tbody.append(tr);
  }
}

  global.TetherAudit = { GENESIS, canonicalJson, sha256Hex, appendEntry, verifyChain, renderChainRows };
})(globalThis);
