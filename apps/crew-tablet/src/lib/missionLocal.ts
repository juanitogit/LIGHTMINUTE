/**
 * Browser-local mission queue, used when the local Python API is not reachable
 * (the published Pages build has no backend).
 *
 * It mirrors the contract of `services/engine/tether_engine/api/mission_link.py`
 * so `EarthLink` can run the same flow, but the consent filter and the delay
 * run in this browser: nothing is enforced by a server here and the UI says so.
 * Data never leaves the device.
 */
export type LocalRole = "crew" | "medical_officer" | "flight_surgeon";
export interface LocalSession { token: string; role: LocalRole; crew: string; local: true }
export interface LocalMessage {
  id: string;
  crew: string;
  direction: "ground" | "earth";
  text: string;
  report: Record<string, unknown>;
  sent: number;
  arrival: number;
}

/** Same DEMO POLICY offsets the engine uses: one-way seconds per profile. */
const PROFILES: Record<string, [number, number]> = { iss: [0, 0], moon: [1.3, 1.3], mars: [180, 1320] };
const DEMO_PIN = "2026";
const STORE = "lightminute-local-mission-v1";
export const WITHHELD_TEXT = "[Message text withheld: behavioral-text consent is off]";

interface StoreShape { messages: LocalMessage[] }

function read(): StoreShape {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "null") as StoreShape | null;
    return raw && Array.isArray(raw.messages) ? raw : { messages: [] };
  } catch {
    return { messages: [] };
  }
}

function write(store: StoreShape) {
  try {
    localStorage.setItem(STORE, JSON.stringify(store));
  } catch {
    /* storage full or disabled: the queue simply does not persist */
  }
}

function numericOnly(section: unknown): Record<string, number> {
  if (!section || typeof section !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(section as Record<string, unknown>)) {
    if (/^[a-z][a-z0-9_]{0,39}$/.test(key) && typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

export function localLogin(role: LocalRole, crew: string, pin: string): LocalSession {
  if (pin !== DEMO_PIN) throw new Error("PIN demo incorrecto");
  return { token: "local-demo", role, crew, local: true };
}

export interface SendInput {
  crew: string;
  text: string;
  profile: string;
  day: number;
  report: Record<string, unknown>;
  consent: { vitals: boolean; symptoms: boolean; behavioral: boolean };
}

export function localSend(session: Pick<LocalSession, "role">, body: SendInput): LocalMessage {
  const consent = body.consent;
  // Consent is applied before storing, exactly like the server: a withheld
  // field is never written, not just hidden afterwards.
  const report = Object.fromEntries(
    (["vitals", "symptoms", "behavioral"] as const)
      .filter((name) => consent[name] && body.report[name] !== undefined)
      .map((name) => [name, consent.behavioral ? body.report[name] : numericOnly(body.report[name])]),
  );
  const direction: LocalMessage["direction"] = session.role === "flight_surgeon" ? "earth" : "ground";
  const text = direction === "ground" && !consent.behavioral ? WITHHELD_TEXT : body.text.trim();
  const [lo, hi] = PROFILES[body.profile] ?? PROFILES.mars!;
  const delay = lo + (hi - lo) * Math.min(1, (body.day - 1) / 23);
  const now = Date.now() / 1000;
  const message: LocalMessage = {
    id: crypto.randomUUID(),
    crew: body.crew,
    direction,
    text,
    report,
    sent: now,
    arrival: now + delay,
  };
  const store = read();
  write({ messages: [...store.messages, message] });
  return message;
}

export interface LocalState {
  server_time: number;
  messages: (Omit<LocalMessage, "sent" | "arrival"> & { sent: number; arrival: number; remaining_s: number; delivered: boolean })[];
  protocol_runs: [];
}

export function localState(session: Pick<LocalSession, "role" | "crew">): LocalState {
  const now = Date.now() / 1000;
  const ownDirection = session.role === "flight_surgeon" ? "earth" : "ground";
  const messages = read()
    .messages.slice()
    .sort((a, b) => b.sent - a.sent)
    .filter((message) => session.role !== "crew" || message.crew === session.crew)
    // Inbound replies stay hidden until the delay elapses, like the server.
    .filter((message) => message.direction === ownDirection || message.arrival <= now)
    .map((message) => ({
      ...message,
      remaining_s: Math.max(0, message.arrival - now),
      delivered: message.arrival <= now,
    }));
  return { server_time: now, messages, protocol_runs: [] };
}

export function localClear() {
  try {
    localStorage.removeItem(STORE);
  } catch {
    /* nothing to clear */
  }
}
