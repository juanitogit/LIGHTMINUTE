import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;

/** Browser dictation for synthetic demonstration text. */
export function useDictation(onText: (text: string) => void) {
  const active = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const host = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  const Speech = host.SpeechRecognition ?? host.webkitSpeechRecognition;

  useEffect(
    () => () => {
      const rec = active.current;
      active.current = null;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      }
    },
    [],
  );

  const start = useCallback(() => {
    if (!Speech) return;
    try {
      const rec = new Speech();
      active.current = rec;
      rec.lang = navigator.language;
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const text = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (text) onText(text);
      };
      rec.onerror = (event) => setStatus(`Dictado detenido: ${event.error}.`);
      rec.onend = () => {
        setListening(false);
        active.current = null;
        setStatus((current) => (current.startsWith("Escuchando") ? "Dictado terminado." : current));
      };
      setListening(true);
      setStatus("Escuchando…");
      rec.start();
    } catch {
      setListening(false);
      setStatus("No se pudo iniciar el dictado.");
    }
  }, [Speech, onText]);

  const stop = useCallback(() => active.current?.stop(), []);

  return { supported: Boolean(Speech), listening, status, start, stop };
}
