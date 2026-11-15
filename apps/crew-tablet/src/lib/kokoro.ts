/**
 * Kokoro TTS for the helmet visors.
 *
 * kokoro-js 1.2.1 ships only English voices: the Spanish voices of the
 * checkpoint are not wired into its voice table, and its phonemizer path is
 * fixed to English. So English is synthesized with Kokoro
 * and Spanish with the browser's own speech engine, chosen automatically from
 * the text. The UI names the engine that actually spoke; nothing is claimed to
 * be a recording or a real crew voice.
 */
export type SpeechLang = "es" | "en";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const EN_VOICE = "af_heart";
const ES_LANGUAGE = "es-ES";

const SPANISH_ACCENT = /[ñÑáéíóúÁÉÍÓÚüÜ¿¡]/;
const SPANISH_WORDS =
  /\b(el|la|los|las|un|una|de|del|que|con|para|por|está|están|son|tiene|hay|día|días|tripulante|sueño|dolor|frecuencia|temperatura|radiación|integridad|reacción|cabeza|respuesta|qué|cómo|cuál|dime|explica)\b/gi;
const ENGLISH_WORDS =
  /\b(the|is|are|what|how|why|day|crew|sleep|heart|rate|temperature|radiation|integrity|reaction|headache|please|explain|tell)\b/gi;

/** Spanish unless the text is clearly English; accents win over word counting. */
export function detectSpeechLang(text: string): SpeechLang {
  if (SPANISH_ACCENT.test(text)) return "es";
  const spanish = (text.match(SPANISH_WORDS) ?? []).length;
  const english = (text.match(ENGLISH_WORDS) ?? []).length;
  if (spanish === 0 && english === 0) {
    return (navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en";
  }
  return spanish >= english ? "es" : "en";
}

type KokoroModel = Awaited<ReturnType<typeof loadKokoro>>;
let modelPromise: Promise<KokoroModel> | null = null;

async function loadKokoro(onProgress?: (message: string) => void) {
  const { KokoroTTS } = await import("kokoro-js");
  return KokoroTTS.from_pretrained(MODEL, {
    dtype: "q8",
    device: "wasm",
    progress_callback: (event: { status?: string; progress?: number; file?: string }) => {
      if (!onProgress) return;
      if (event.status === "progress" && typeof event.progress === "number") {
        onProgress(`Preparando Kokoro… ${Math.round(event.progress)}%`);
      } else if (event.status === "ready") {
        onProgress("Kokoro listo.");
      }
    },
  });
}

function kokoro(onProgress?: (message: string) => void) {
  modelPromise ??= loadKokoro(onProgress).catch((error: unknown) => {
    // A failed download must not poison every later attempt.
    modelPromise = null;
    throw error;
  });
  return modelPromise;
}

export interface SpokenClip { url: string; mime: string }

/** English only: see the module comment about the voice table. */
export async function kokoroClip(text: string, onProgress?: (message: string) => void): Promise<SpokenClip> {
  const tts = await kokoro(onProgress);
  const audio = await tts.generate(text, { voice: EN_VOICE });
  const blob = await audio.toBlob();
  return { url: URL.createObjectURL(blob), mime: blob.type || "audio/wav" };
}

/** Browser speech engine, used for Spanish and as the fallback. */
export function browserSpeak(text: string, lang: SpeechLang, onEnd: () => void): boolean {
  if (!("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const prefix = lang === "es" ? "es" : "en";
  utterance.lang = lang === "es" ? ES_LANGUAGE : "en-US";
  const voice = synth.getVoices().find((candidate) => candidate.lang.toLowerCase().startsWith(prefix));
  if (voice) utterance.voice = voice;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  synth.speak(utterance);
  return true;
}

export function stopBrowserSpeech() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
