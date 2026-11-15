/**
 * Speech for the helmet visors, synthesized on the device.
 *
 * The visor uses the browser voice first for a quicker response. The optional
 * neural synthesis helpers remain available for other callers.
 * The UI names the engine that actually spoke; nothing is claimed to be a
 * recording or a real crew voice.
 */
export type SpeechLang = "es" | "en";

const MODELS: Record<SpeechLang, string> = {
  es: "Xenova/mms-tts-spa",
  en: "Xenova/mms-tts-eng",
};
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

type SpeechPipeline = (text: string) => Promise<{ audio: Float32Array; sampling_rate: number }>;
const pipelines = new Map<SpeechLang, Promise<SpeechPipeline>>();

async function load(lang: SpeechLang, onProgress?: (message: string) => void) {
  const { pipeline } = await import("@huggingface/transformers");
  const loaded = await pipeline("text-to-speech", MODELS[lang], {
    dtype: "q8",
    device: "wasm",
    progress_callback: (event: { status?: string; progress?: number }) => {
      if (!onProgress) return;
      if (event.status === "progress" && typeof event.progress === "number") {
        onProgress(`Preparing local voice… ${Math.round(event.progress)}%`);
      } else if (event.status === "ready") {
        onProgress("Voz local lista.");
      }
    },
  });
  return loaded as unknown as SpeechPipeline;
}

function model(lang: SpeechLang, onProgress?: (message: string) => void) {
  let pending = pipelines.get(lang);
  if (!pending) {
    pending = load(lang, onProgress).catch((error: unknown) => {
      // A failed download must not poison every later attempt.
      pipelines.delete(lang);
      throw error;
    });
    pipelines.set(lang, pending);
  }
  return pending;
}

export interface SpokenClip { url: string; mime: string }

/** Neural voice, generated locally in the browser for the detected language. */
export async function neuralClip(
  text: string,
  lang: SpeechLang,
  onProgress?: (message: string) => void,
): Promise<SpokenClip> {
  const tts = await model(lang, onProgress);
  const result = await tts(text);
  const samples = result.audio instanceof Float32Array ? result.audio : Float32Array.from(result.audio);
  return { url: URL.createObjectURL(wavBlob(samples, result.sampling_rate)), mime: "audio/wav" };
}

/** Minimal 16-bit PCM WAV wrapper: the models return raw float samples. */
function wavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Browser speech engine. Prefer local voices when available for lower latency;
 * some devices have only network-backed voices.
 */
export function browserSpeak(text: string, lang: SpeechLang, onEnd: () => void): boolean {
  if (!("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const prefix = lang === "es" ? "es" : "en";
  utterance.lang = lang === "es" ? ES_LANGUAGE : "en-US";
  const voice = bestVoice(
    synth.getVoices().filter((candidate) => candidate.lang.toLowerCase().startsWith(prefix)),
    lang,
  );
  try {
    if (voice) utterance.voice = voice;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    synth.speak(utterance);
  } catch {
    return false;
  }
  return true;
}

function bestVoice(voices: SpeechSynthesisVoice[], lang: SpeechLang): SpeechSynthesisVoice | undefined {
  const score = (voice: SpeechSynthesisVoice) => {
    const name = voice.name.toLowerCase();
    let value = 0;
    if (/natural|neural|online/.test(name)) value += 6;
    if (/google/.test(name)) value += 4;
    if (voice.localService) value += 12;
    if (lang === "es" && voice.lang.toLowerCase().startsWith("es-es")) value += 1;
    return value;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

// Chrome fills its voice list asynchronously; asking once at startup means the
// first answer already uses the best voice instead of the default one.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
}

export function stopBrowserSpeech() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
