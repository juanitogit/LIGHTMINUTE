/**
 * Types for the demo-data contract (docs/DEMO_DATA_CONTRACT.md).
 * Numbers come from the deterministic engine; the UI only renders them.
 */

export type Level = "info" | "watch" | "act" | "escalate";
export type Confidence = "low" | "moderate" | "high";

export interface LensVerdict {
  earth: string;
  space: string;
  personal: string;
  pattern: string;
}

export interface Reading {
  value: number;
  baseline?: number;
  ci95?: [number, number];
  z?: number;
  p?: number;
  n_seen?: number;
  unit: string;
  hrp_risk: string;
  hazard: string;
  lens: LensVerdict;
  /** Additive optional field: Earth reference range, when the export exposes it. */
  earth_range?: [number, number];
}

export interface DecisionCard {
  level: Level;
  headline: string;
  what_changed: string;
  why_it_matters: string;
  confidence: Confidence;
  do_now: string[];
  monitor: string[];
  escalate_if: string[];
  ground_message: string;
  citations: string[];
}

export interface Routing {
  expected_reply_s: number;
  act_onboard_first: boolean;
  send_now: boolean;
  priority: number;
  message_budget_chars: number;
  note?: string;
}

export interface CrewDay {
  level: Level;
  syndrome_z: number;
  learning: boolean;
  indicators: Record<string, Reading>;
  card: DecisionCard;
  card_source: "llm" | "template" | string;
  routing: Routing;
  /** Additive optional field: which onboard protocol (A4) applies today. */
  protocol_id?: string;
}

export interface Attribution {
  mode: "none" | "individual" | "shared" | string;
  affected: string[];
  advice?: string;
}

export interface ScenarioDay {
  day: number;
  crew: Record<string, CrewDay>;
  attribution?: Attribution;
}

export interface ScenarioMeta {
  title?: string;
  summary?: string;
  default_protocol?: string;
  protocol_id?: string;
  [key: string]: unknown;
}

export interface ScenarioDoc {
  name?: string;
  source?: string;
  degraded?: boolean;
  synthetic?: boolean;
  note?: string;
  /** A1 exports title/description at the top level; `meta` is the older shape. */
  title?: string;
  description?: string;
  scenario?: string;
  variant?: string;
  delay_profile?: string;
  onset_day?: number;
  crew?: Record<string, { role?: string; label?: string }>;
  crew_roles?: Record<string, string>;
  meta?: ScenarioMeta;
  indicators?: string[];
  days: ScenarioDay[];
}

export type ScenarioOrigin = "api" | "scenario-file" | "demo-data";

export interface LoadedScenario {
  doc: ScenarioDoc;
  origin: ScenarioOrigin;
  degraded: boolean;
  /** Human-readable description of where the numbers came from. */
  originLabel: string;
}

export interface ScenarioSummary {
  name: string;
  title?: string;
  available?: boolean;
  source?: string;
}

export interface ApiHealth {
  status?: string;
  llm_provider?: string;
  llm_key_present?: boolean;
  llm_model?: string;
  version?: string;
}

export interface CardResponse {
  card: DecisionCard;
  card_source?: "llm" | "template" | string;
  verifier_errors?: string[];
  provider?: string;
  effort?: string;
  attempts?: number;
}

export interface ScenarioLoadResult {
  scenario: LoadedScenario;
  /** True when the app had to fall back further than the API. */
  fellBack: boolean;
}
