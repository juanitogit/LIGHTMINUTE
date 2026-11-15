/**
 * Groq proxy for the visor voice assistant (Cloudflare Pages Function).
 *
 * The key never reaches the browser: it lives in the deployment environment
 * (`wrangler pages secret put GROQ_API_KEY`). The model may only explain the
 * values the visor already shows — never estimate, cite thresholds it was not
 * given, or produce a diagnosis.
 */
interface Env {
  GROQ_API_KEY?: string;
  GROQ_BASE_URL?: string;
  GROQ_MODEL?: string;
  GROQ_FALLBACK_MODEL?: string;
}

const DEFAULT_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_FALLBACK_MODEL = "openai/gpt-oss-20b";
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

const SYSTEM = `You are the LIGHTMINUTE helmet-visor assistant. The crew member asks about the values currently displayed on the page.
Rules, in order of priority:
1. Use ONLY the numbers and labels in the supplied context JSON. Every number you say must appear there, unchanged.
2. If the context does not contain the answer, say that this page does not include that data. Never estimate or fill gaps.
3. Never diagnose, name a disease as a conclusion, prescribe, or recommend treatment or a dose. Describe what the values show and, if useful, name which displayed field is unusual. The app is a synthetic training simulation, not a medical device.
4. Do not invent thresholds, citations, sources or normal ranges: none are provided beyond what the context states.
5. Answer in the same language as the question, every sentence in that language. Use the page's human labels (CO₂ del traje, frecuencia cardíaca, temperatura central), translated into that language if needed, so no sentence mixes two languages. Never say raw field names such as co2_ppm.
6. At most 90 words, plain sentences meant to be read aloud. No markdown, no lists, no emoji.`;

const NUMERIC_KEYS = [
  "day", "max_day", "integrity_score", "heart_rate_bpm", "core_temp_c", "sleep_h",
  "pvt_ms", "co2_ppm", "headache_0_10", "radiation_scale", "radiation_pfu",
] as const;
const TEXT_KEYS = ["page", "scenario", "crew", "level", "body"] as const;

type Body = { question?: unknown; context?: unknown; language?: unknown };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Whitelisted copy: nothing the model sees is passed through unchecked. */
function sanitize(context: unknown) {
  if (!context || typeof context !== "object") return null;
  const source = context as Record<string, unknown>;
  const clean: Record<string, string | number | boolean | null> = {};
  let fields = 0;
  for (const key of NUMERIC_KEYS) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      clean[key] = value;
      fields += 1;
    }
  }
  for (const key of TEXT_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && value.length <= 120) {
      clean[key] = value;
      fields += 1;
    }
  }
  if (typeof source.headline === "string" && source.headline.length > 0) {
    clean.headline = source.headline.slice(0, 240);
    fields += 1;
  } else {
    clean.headline = null;
  }
  return fields >= 3 ? clean : null;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ detail: "Cuerpo JSON no válido." }, 400);
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 600) {
    return json({ detail: "La pregunta debe tener entre 1 y 600 caracteres." }, 400);
  }
  const snapshot = sanitize(body.context);
  if (!snapshot) return json({ detail: "Falta el contexto de la página." }, 400);
  // The client detects the question's language; the model follows the explicit
  // directive more reliably than the "same language" rule alone.
  const directive = body.language === "en"
    ? "\n\nAnswer strictly in English."
    : body.language === "es"
      ? "\n\nResponde estrictamente en español."
      : "";

  const key = (env.GROQ_API_KEY ?? "").trim();
  if (!key) {
    return json({ detail: "El asistente necesita GROQ_API_KEY en el entorno del despliegue." }, 503);
  }
  const baseUrl = (env.GROQ_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const model = env.GROQ_MODEL ?? DEFAULT_MODEL;
  const fallbackModel = env.GROQ_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL;
  const payload = (chosen: string) => JSON.stringify({
    model: chosen,
    messages: [
      { role: "system", content: SYSTEM + directive },
      { role: "user", content: JSON.stringify({ question, page: snapshot }) },
    ],
    max_tokens: 400,
    reasoning_effort: "low",
  });

  // Groq's free tier answers 429 and 5xx under short bursts. Two short retries
  // and a lighter model keep the visor on the LLM instead of dropping to the
  // deterministic sentence on the first hiccup.
  const attempts = [model, model, fallbackModel];
  let upstream: Response | null = null;
  let used = model;
  for (let attempt = 0; attempt < attempts.length; attempt += 1) {
    used = attempts[attempt];
    if (attempt > 0) {
      const told = Number(upstream?.headers.get("retry-after") ?? "");
      await sleep(Number.isFinite(told) && told > 0 ? Math.min(told * 1000, 2500) : attempt === 1 ? 600 : 1500);
    }
    try {
      upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: payload(used),
      });
    } catch {
      if (attempt === attempts.length - 1) return json({ detail: "No se pudo contactar con Groq." }, 502);
      continue;
    }
    if (upstream.ok || !RETRY_STATUS.has(upstream.status)) break;
  }

  if (!upstream || !upstream.ok) {
    // Never echo the key or the upstream body verbatim.
    return json({ detail: `Groq respondió ${upstream ? upstream.status : "sin respuesta"}.` }, 502);
  }

  const result = (await upstream.json().catch(() => null)) as
    | { choices?: { message?: { content?: unknown } }[] }
    | null;
  const answer = result?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    return json({ detail: "Groq devolvió una respuesta vacía." }, 502);
  }
  return json({ answer: answer.trim(), provider: "groq", model: used });
};

export const onRequest = async (context: { request: Request; env: Env }) => {
  if (context.request.method !== "POST") return json({ detail: "Método no permitido." }, 405);
  return onRequestPost(context);
};
