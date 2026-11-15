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
    `Día ${s.day} de ${s.max_day}, tripulante ${s.crew}, escenario ${s.scenario}.`,
    `Estado operativo ${s.level} e integridad global ${s.integrity_score}%.`,
    `Frecuencia cardíaca ${fmt(s.heart_rate_bpm)} bpm y temperatura central ${fmt(s.core_temp_c, 1)} °C.`,
    `Sueño ${fmt(s.sleep_h, 1)} h, PVT ${fmt(s.pvt_ms)} ms y cefalea ${fmt(s.headache_0_10)}/10.`,
    `CO₂ del traje ${fmt(s.co2_ppm)} ppm y clima espacial S${s.radiation_scale} (${fmt(s.radiation_pfu, 1)} pfu).`,
  ];
}

export function snapshotSummary(s: VisorSnapshot): string {
  return `${facts(s).join(" ")} Valores sintéticos de la simulación; no es un dispositivo médico.`;
}

const RULES: { test: RegExp; answer: (s: VisorSnapshot) => string }[] = [
  { test: /co2|co₂|di[oó]xido|aire|respir/i, answer: (s) => `El visor muestra ${fmt(s.co2_ppm)} ppm de CO₂ en el bucle del traje en el día ${s.day}.` },
  { test: /sue[nñ]o|descans|dorm/i, answer: (s) => `La página registra ${fmt(s.sleep_h, 1)} h de sueño para el tripulante ${s.crew} en el día ${s.day}.` },
  { test: /pvt|reacci[oó]n|atenci[oó]n|cognic/i, answer: (s) => `El tiempo de reacción PVT es de ${fmt(s.pvt_ms)} ms (día ${s.day}, tripulante ${s.crew}).` },
  { test: /temperatura|fiebre|t[eé]rmic|°c/i, answer: (s) => `La temperatura central mostrada es ${fmt(s.core_temp_c, 1)} °C.` },
  { test: /pulso|coraz[oó]n|cardi|frecuencia|bpm|fc\b/i, answer: (s) => `La frecuencia cardíaca en reposo mostrada es ${fmt(s.heart_rate_bpm)} bpm.` },
  { test: /cefalea|dolor|cabeza/i, answer: (s) => `La cefalea autoreportada es ${fmt(s.headache_0_10)}/10.` },
  { test: /radiaci[oó]n|clima espacial|sep|pfu|tormenta/i, answer: (s) => `El clima espacial de la página marca S${s.radiation_scale} con ${fmt(s.radiation_pfu, 1)} pfu (>10 MeV).` },
  { test: /integridad|estado|nivel|alarma/i, answer: (s) => `El estado operativo es ${s.level} y la integridad global ${s.integrity_score}%.` },
  { test: /d[ií]a|tripulante|qui[eé]n|resumen|todo/i, answer: (s) => facts(s).join(" ") },
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
  return `El asistente no está disponible ahora. Valores de la página: ${facts(s).join(" ")}`;
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
  if (!response.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : "El asistente no está disponible.");
  if (typeof payload.answer !== "string" || !payload.answer.trim()) throw new Error("El asistente devolvió una respuesta vacía.");
  return {
    answer: payload.answer.trim(),
    provider: payload.provider ?? "unknown",
    model: payload.model ?? "",
  };
}
