import { useCallback, useEffect, useRef, useState } from "react";
import {
  browserSpeak,
  detectSpeechLang,
  kokoroClip,
  spanishClip,
  stopBrowserSpeech,
  type SpokenClip,
} from "../lib/kokoro";

export type SpeechEngine = "kokoro" | "spanish" | "browser" | null;
export type SpeechStatus = "idle" | "preparing" | "speaking";

/**
 * Speaks visor text with a local neural model: Kokoro for English and MMS TTS
 * for Spanish. The browser voice is only reached when a model cannot load.
 * Always stops cleanly: an unmount, a new utterance or a manual stop releases
 * the audio URL.
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

  const playClip = useCallback(
    async (load: (progress: (text: string) => void) => Promise<SpokenClip>) => {
      const clip = await load((text) => {
        if (alive.current) setMessage(text);
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
    },
    [],
  );

  const speak = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      release();
      setMessage("");
      const lang = detectSpeechLang(clean);

      if (lang === "es") {
        setEngine("spanish");
        setStatus("preparing");
        try {
          await playClip((progress) => spanishClip(clean, progress));
          return;
        } catch {
          if (!alive.current) return;
          // The model needs a first-use download; the system voice keeps the
          // visor usable when it cannot load.
          if (browserSpeak(clean, "es", () => alive.current && setStatus("idle"))) {
            setEngine("browser");
            setStatus("speaking");
            setMessage("La voz española local no está disponible (descarga o WebAssembly). Se ha usado la voz del navegador.");
          } else {
            setStatus("idle");
            setMessage("No hay ninguna voz disponible en este equipo; el texto sigue visible en pantalla.");
          }
          return;
        }
      }

      setEngine("kokoro");
      setStatus("preparing");
      try {
        await playClip((progress) => kokoroClip(clean, progress));
      } catch {
        if (!alive.current) return;
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
    [playClip, release],
  );

  return { engine, status, message, speak, stop };
}
