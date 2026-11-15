/**
 * Data access for the crew tablet.
 *
 * Order for every read (docs/DEMO_DATA_CONTRACT.md, A2 handoff):
 *   engine API -> static scenario file -> demo-data.json
 * The UI never recomputes engine numbers: it renders whatever this layer returns
 * and clearly labels when it had to fall back.
 */
import { titleFromName } from "./format";
import { verifySignedJson } from "./verifySigned";
import {
  buildInvestigationScenario,
  isInvestigationScenario,
  INVESTIGATION_SUMMARIES,
} from "./investigationScenarios";
import type {
  ApiHealth,
  CardResponse,
  LoadedScenario,
  ScenarioDoc,
  ScenarioSummary,
} from "./types";

const BASE = import.meta.env.BASE_URL || "/";
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

const STATIC_TIMEOUT_MS = 2500;
const API_TIMEOUT_MS = 2500;
const CARD_TIMEOUT_MS = 15000;

const apiUrl = (path: string) => `${API_BASE}${path}`;

/**
 * Set once the health probe fails. Skipping API calls afterwards keeps the
 * static demo instant instead of waiting on a proxy that is not running.
 */
let apiDisabled = false;

export function apiIsDisabled(): boolean {
  return apiDisabled;
}

/** Public assets respect Vite's base so the build also works from a subpath. */
export function staticUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return BASE.endsWith("/") ? `${BASE}${clean}` : `${BASE}/${clean}`;
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
    this.status = status;
    this.name = "HttpError";
  }
}

async function fetchJson<T>(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
    if (!response.ok) throw new HttpError(response.status, url);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

function asScenarioDoc(raw: unknown, name: string, requireIdentity = false): ScenarioDoc {
  if (!raw || typeof raw !== "object") throw new Error("scenario payload is not an object");
  const doc = raw as ScenarioDoc;
  if (!Array.isArray(doc.days) || doc.days.length === 0) {
    throw new Error(`scenario ${name} has no days`);
  }
  // Identity check: a fallback file must never answer for a different scenario
  // (demo-data.json is cmo_fever, so asking for co2_creep with it is a mismatch).
  const scenarioField = typeof doc.scenario === "string" ? doc.scenario : undefined;
  const nameField = (doc as { name?: unknown }).name;
  const declaredName = typeof nameField === "string" ? nameField : undefined;
  // `scenario` and `name` disagreeing means the payload was edited or spliced.
  if (scenarioField && declaredName && scenarioField !== declaredName) {
    throw new Error(
      `scenario identity conflict: scenario=${scenarioField}, name=${declaredName}`,
    );
  }
  const declared = scenarioField ?? declaredName;
  const hasIdentity = typeof declared === "string" && declared.length > 0;
  if (hasIdentity && declared !== name) {
    throw new Error(`scenario identity mismatch: asked ${name}, got ${declared}`);
  }
  // A static file is addressed by scenario name, so a payload without identity
  // cannot be proven to belong to it: reject rather than trust it.
  if (!hasIdentity && requireIdentity) {
    throw new Error(`scenario identity missing: asked ${name}`);
  }
  const firstDay = doc.days[0];
  const indicators =
    doc.indicators && doc.indicators.length > 0
      ? doc.indicators
      : firstDay
        ? Object.keys(firstDay.crew?.[Object.keys(firstDay.crew)[0] ?? ""]?.indicators ?? {})
        : [];
  return { ...doc, name: doc.name ?? name, indicators };
}

export interface ScenarioListResult {
  scenarios: ScenarioSummary[];
  source: "api" | "index" | "defaults";
}

const DEFAULT_NAMES = ["cmo_fever", "sep_sleep_loss", "co2_creep"];

export const FALLBACK_SCENARIOS: ScenarioSummary[] = DEFAULT_NAMES.map((name) => ({
  name,
  title: titleFromName(name),
  available: false,
  source: "demo-data",
}));

/** Scenario index, for the picker. Never throws: defaults keep the demo alive. */
export async function loadScenarioIndex(): Promise<ScenarioListResult> {
  if (!apiDisabled) {
    try {
      const body = await fetchJson<{ scenarios?: ScenarioSummary[] }>(
        apiUrl("/api/scenarios"),
        API_TIMEOUT_MS,
      );
      if (Array.isArray(body.scenarios) && body.scenarios.length > 0) {
        return {
          scenarios: [...body.scenarios, ...INVESTIGATION_SUMMARIES],
          source: "api",
        };
      }
    } catch {
      /* API down: try the published index. */
    }
  }

  try {
    const body = await verifySignedJson<{ scenarios?: ScenarioSummary[] } | ScenarioSummary[]>(
      "data/scenario-index.json", BASE, STATIC_TIMEOUT_MS,
    );
    const list = Array.isArray(body) ? body : body.scenarios;
    if (Array.isArray(list) && list.length > 0) {
      return {
        scenarios: [...list, ...INVESTIGATION_SUMMARIES],
        source: "index",
      };
    }
  } catch {
    /* No index yet: A1 may not have published it. */
  }

  return {
    scenarios: [...FALLBACK_SCENARIOS, ...INVESTIGATION_SUMMARIES],
    source: "defaults",
  };
}

export async function loadHealth(): Promise<ApiHealth | null> {
  try {
    const health = await fetchJson<ApiHealth>(apiUrl("/api/health"), API_TIMEOUT_MS);
    apiDisabled = false;
    return health;
  } catch {
    apiDisabled = true;
    return null;
  }
}

/**
 * Load one scenario. Throws only when no source at all is reachable, so the
 * caller can show a real error instead of an empty dashboard.
 */
export async function loadScenario(name: string): Promise<LoadedScenario> {
  // Investigation case scenarios are generated entirely in the browser.
  // They never go to the API, so the backend contract (3 names) is preserved.
  if (isInvestigationScenario(name)) {
    const doc = buildInvestigationScenario(name);
    return {
      doc,
      origin: "browser-engine",
      degraded: false,
      originLabel: "research case · NASA HRP evidence · synthetic data",
    };
  }

  const encoded = encodeURIComponent(name);

  if (!apiDisabled) {
    try {
      const raw = await fetchJson<ScenarioDoc>(
        apiUrl(`/api/scenario/${encoded}`),
        API_TIMEOUT_MS,
      );
      const doc = asScenarioDoc(raw, name);
      const degraded = doc.degraded === true || doc.source === "demo-data";
      return {
        doc,
        origin: "api",
        degraded,
        originLabel: degraded
          ? "engine API · demo-data fallback"
          : `engine API · ${doc.source ?? "engine"}`,
      };
    } catch {
      /* Static fallback below. */
    }
  }

  try {
    const raw = await verifySignedJson<ScenarioDoc>(`data/scenario-${encoded}.json`, BASE, STATIC_TIMEOUT_MS);
    return {
      doc: asScenarioDoc(raw, name, true),
      origin: "scenario-file",
      degraded: false,
      originLabel: "static scenario file · signature verified",
    };
  } catch {
    /* Last resort: the scaffold demo file. */
  }

  const raw = await verifySignedJson<ScenarioDoc>("demo-data.json", BASE, STATIC_TIMEOUT_MS);
  return {
    doc: asScenarioDoc(raw, name, true),
    origin: "demo-data",
    degraded: true,
    originLabel: "demo-data.json · signed static fallback",
  };
}

/** Ask the API for an explained card. Returns null when the API is unavailable. */
export async function requestCard(params: {
  scenario: string;
  crew: string;
  day: number;
}): Promise<CardResponse | null> {
  if (apiDisabled) return null;
  try {
    const body = await fetchJson<CardResponse>(apiUrl("/api/card"), CARD_TIMEOUT_MS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!body || !body.card || !Array.isArray(body.card.do_now)) return null;
    return body;
  } catch {
    return null;
  }
}

export async function loadRadiation(): Promise<unknown | null> {
  try {
    return await fetchJson<unknown>(staticUrl("data/radiation.json"), STATIC_TIMEOUT_MS);
  } catch {
    return null;
  }
}

/** Build-time NASA DONKI snapshot. The browser never calls NASA. */
export async function loadSpaceWeather(): Promise<unknown | null> {
  try {
    return await fetchJson<unknown>(staticUrl("data/space-weather.json"), STATIC_TIMEOUT_MS);
  } catch {
    return null;
  }
}

export async function loadValidation(): Promise<unknown | null> {
  try {
    return await fetchJson<unknown>(staticUrl("data/validation.json"), STATIC_TIMEOUT_MS);
  } catch {
    return null;
  }
}

export async function loadLlmStats(): Promise<Record<string, unknown> | null> {
  if (apiDisabled) return null;
  try {
    return await fetchJson<Record<string, unknown>>(apiUrl("/api/llm-stats"), API_TIMEOUT_MS);
  } catch {
    return null;
  }
}

/** Fetch any optional JSON file (used by the protocol runner feature flag). */
export async function loadOptionalJson(path: string): Promise<unknown | null> {
  try {
    return await fetchJson<unknown>(staticUrl(path), STATIC_TIMEOUT_MS);
  } catch {
    return null;
  }
}
