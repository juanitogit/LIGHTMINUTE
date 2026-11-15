import { useCallback, useEffect, useRef, useState } from "react";
import { browserSpeak, detectSpeechLang, stopBrowserSpeech } from "../lib/speech";

export type SpeechEngine = "neural" | "browser" | null;
export type SpeechStatus = "idle" | "preparing" | "speaking";

/**
 * Uses the browser voice directly to avoid a model download and inference delay.
 */
export function useVisorSpeech() {
  const [engine, setEngine] = useState<SpeechEngine>(null);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  const generation = useRef(0);

  const release = useCallback(() => {
    generation.current += 1;
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

      const current = generation.current;
      if (browserSpeak(clean, lang, () => {
        if (alive.current && generation.current === current) setStatus("idle");
      })) {
        setEngine("browser");
        setStatus("speaking");
      } else {
        setEngine(null);
        setStatus("idle");
        setMessage("No browser voice is available; the response remains visible.");
      }
    },
    [release],
  );

  return { engine, status, message, speak, stop };
}
