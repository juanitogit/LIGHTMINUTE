/**
 * Grounded visor assistant.
 *
 * The deterministic engine owns the numbers; this module only repeats the
 * values the visor is already showing and lets an LLM (Groq) explain them.
 * Nothing is estimated here, no threshold is invented and no diagnosis is
 * produced: the project's rule is that the LLM explains, never decides.
 */
export interface VisorSnapshot {
  page: string;
  body: "mars" | "moon";
  scenario: string;
  crew: string;
  day: number;
  max_day: number;
  level: string;
  integrity_score: number;
  heart_rate_bpm: number;
  core_temp_c: number;
  sleep_h: number;
  pvt_ms: number;
  co2_ppm: number;
  headache_0_10: number;
  radiation_scale: number;
  radiation_pfu: number;
  headline: string | null;
}

const base = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

function fmt(value: number, decimals = 0) {
  return value.toFixed(decimals);
}

/** Every sentence is built from snapshot fields only. */
function facts(s: VisorSnapshot): string[] {
  return [
    `Day ${s.day} of ${s.max_day}, crew ${s.crew}, scenario ${s.scenario}.`,
    `Operational status ${s.level} and overall integrity ${s.integrity_score}%.`,
    `Heart rate ${fmt(s.heart_rate_bpm)} bpm and core temperature ${fmt(s.core_temp_c, 1)} °C.`,
    `Sleep ${fmt(s.sleep_h, 1)} h, PVT ${fmt(s.pvt_ms)} ms and headache ${fmt(s.headache_0_10)}/10.`,
    `Scenario CO₂ ${fmt(s.co2_ppm)} ppm and illustrative space weather S${s.radiation_scale} (${fmt(s.radiation_pfu, 1)} pfu).`,
  ];
}

export function snapshotSummary(s: VisorSnapshot): string {
  return `${facts(s).join(" ")} Synthetic simulation values; not a medical device.`;
}

const RULES: { test: RegExp; answer: (s: VisorSnapshot) => string }[] = [
  { test: /co2|co₂|di[oó]xido|aire|respir|air|breath/i, answer: (s) => `The visor shows ${fmt(s.co2_ppm)} ppm of scenario CO₂ on day ${s.day}.` },
  { test: /sue[nñ]o|descans|dorm|sleep|rest/i, answer: (s) => `The page records ${fmt(s.sleep_h, 1)} h of sleep for crew member ${s.crew} on day ${s.day}.` },
  { test: /pvt|reacci[oó]n|atenci[oó]n|cognic|reaction|attention|cognit/i, answer: (s) => `PVT reaction time is ${fmt(s.pvt_ms)} ms (day ${s.day}, crew ${s.crew}).` },
  { test: /temperatura|fiebre|t[eé]rmic|temperature|fever|thermal|°c/i, answer: (s) => `The displayed core temperature is ${fmt(s.core_temp_c, 1)} °C.` },
  { test: /pulso|coraz[oó]n|cardi|frecuencia|pulse|heart|bpm|fc\b/i, answer: (s) => `The displayed resting heart rate is ${fmt(s.heart_rate_bpm)} bpm.` },
  { test: /cefalea|dolor|cabeza|headache|pain/i, answer: (s) => `Self-reported headache is ${fmt(s.headache_0_10)}/10.` },
  { test: /radiaci[oó]n|clima espacial|sep|pfu|tormenta|radiation|space weather|storm/i, answer: (s) => `The page shows illustrative space weather S${s.radiation_scale} at ${fmt(s.radiation_pfu, 1)} pfu (>10 MeV).` },
  { test: /integridad|estado|nivel|alarma|integrity|status|level|alarm/i, answer: (s) => `The operational status is ${s.level} and overall integrity is ${s.integrity_score}%.` },
  { test: /d[ií]a|tripulante|qui[eé]n|resumen|todo|day|crew|who|summary/i, answer: (s) => facts(s).join(" ") },
];

/**
 * Used when no LLM is reachable. It answers only questions the page's own
 * fields can answer and never guesses beyond them.
 */
export function localGroundedAnswer(question: string, s: VisorSnapshot): string {
  const match = RULES.find((rule) => rule.test.test(question));
  if (match) return match.answer(s);
  // Says plainly that the LLM is unreachable instead of dressing a dump of
  // every field as an answer to the question.
  return `The assistant is unavailable. Values on this page: ${facts(s).join(" ")}`;
}

export interface AssistantReply { answer: string; provider: string; model: string }
export type AssistantLanguage = "en" | "es";

/**
 * Groq explains the page's own values. The endpoint refuses to answer without
 * a key, so the caller falls back to `localGroundedAnswer`.
 */
export async function askVisorAssistant(question: string, context: VisorSnapshot, language: AssistantLanguage): Promise<AssistantReply> {
  const response = await fetch(`${base}/api/visor/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context, language }),
    signal: AbortSignal.timeout(25000),
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<AssistantReply> & { detail?: string };
  if (!response.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : "The assistant is unavailable.");
  if (typeof payload.answer !== "string" || !payload.answer.trim()) throw new Error("The assistant returned an empty response.");
  return {
    answer: payload.answer.trim(),
    provider: payload.provider ?? "unknown",
    model: payload.model ?? "",
  };
}
