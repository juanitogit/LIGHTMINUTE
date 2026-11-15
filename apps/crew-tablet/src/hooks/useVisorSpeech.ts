import { useCallback, useEffect, useRef, useState } from "react";
import { browserSpeak, detectSpeechLang, kokoroClip, stopBrowserSpeech } from "../lib/kokoro";

export type SpeechEngine = "kokoro" | "browser" | null;
export type SpeechStatus = "idle" | "preparing" | "speaking";

/**
 * Speaks visor text with Kokoro (English) or the browser voice (Spanish and
 * fallback), picking the engine from the text itself. Always stops cleanly:
 * an unmount, a new utterance or a manual stop releases the audio URL.
 */
export function useVisorSpeech() {
  const [engine, setEngine] = useState<SpeechEngine>(null);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [message, setMessage] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const alive = useRef(true);

  const release = useCallback(() => {
    if (audio.current) {
      audio.current.pause();
      audio.current.src = "";
      audio.current = null;
    }
    if (url.current) {
      URL.revokeObjectURL(url.current);
      url.current = null;
    }
    stopBrowserSpeech();
  }, []);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
  }, [release]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      release();
    };
  }, [release]);

  const speak = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      release();
      setMessage("");
      const lang = detectSpeechLang(clean);

      if (lang === "es") {
        // Spanish has no Kokoro voice in this build: use the system voice.
        if (!browserSpeak(clean, "es", () => setStatus("idle"))) {
          setMessage("Este navegador no puede sintetizar voz. El texto sigue visible en pantalla.");
          return;
        }
        setEngine("browser");
        setStatus("speaking");
        return;
      }

      setEngine("kokoro");
      setStatus("preparing");
      try {
        const clip = await kokoroClip(clean, (progress) => {
          if (alive.current) setMessage(progress);
        });
        if (!alive.current) {
          URL.revokeObjectURL(clip.url);
          return;
        }
        url.current = clip.url;
        const player = new Audio(clip.url);
        audio.current = player;
        player.onended = () => alive.current && setStatus("idle");
        player.onerror = () => alive.current && setMessage("No se pudo reproducir el audio generado.");
        setMessage("");
        setStatus("speaking");
        await player.play();
      } catch {
        if (!alive.current) return;
        // Kokoro needs a first-use download; the system voice keeps the visor usable.
        if (browserSpeak(clean, "en", () => alive.current && setStatus("idle"))) {
          setEngine("browser");
          setStatus("speaking");
          setMessage("Kokoro no está disponible (descarga o WebAssembly). Se ha usado la voz del navegador.");
        } else {
          setStatus("idle");
          setMessage("Kokoro y la voz del navegador no están disponibles en este equipo.");
        }
      }
    },
    [release],
  );

  return { engine, status, message, speak, stop };
}
