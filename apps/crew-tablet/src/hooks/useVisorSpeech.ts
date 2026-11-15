import { useCallback, useEffect, useRef, useState } from "react";
import { browserSpeak, detectSpeechLang, neuralClip, stopBrowserSpeech } from "../lib/speech";

export type SpeechEngine = "neural" | "browser" | null;
export type SpeechStatus = "idle" | "preparing" | "speaking";

/**
 * Speaks visor text with a local neural model (MMS TTS), chosen by language.
 * The browser voice is only reached when the model cannot load. Always stops
 * cleanly: an unmount, a new utterance or a manual stop releases the audio URL.
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

      setEngine("neural");
      setStatus("preparing");
      try {
        const clip = await neuralClip(clean, lang, (progress) => {
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
        // The model needs a first-use download; the system voice keeps the
        // visor usable when it cannot load.
        if (browserSpeak(clean, lang, () => alive.current && setStatus("idle"))) {
          setEngine("browser");
          setStatus("speaking");
          setMessage("La voz local no está disponible (descarga o WebAssembly). Se ha usado la voz del navegador.");
        } else {
          setStatus("idle");
          setMessage("No hay ninguna voz disponible en este equipo; el texto sigue visible en pantalla.");
        }
      }
    },
    [release],
  );

  return { engine, status, message, speak, stop };
}
