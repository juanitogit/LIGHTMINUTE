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

/**
 * Browser dictation for synthetic demonstration text. One phrase per turn: the
 * engine stops on silence and the caller decides when to listen again.
 */
export function useDictation(onText: (text: string) => void) {
  const active = useRef<Recognition | null>(null);
  const handler = useRef(onText);
  handler.current = onText;
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
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
    if (!Speech || active.current) return;
    try {
      const rec = new Speech();
      active.current = rec;
      rec.lang = (navigator.language || "").toLowerCase().startsWith("es") ? "es-ES" : "en-US";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const text = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (text) handler.current(text);
      };
      rec.onerror = (event) => {
        setError(event.error);
        setStatus(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "El navegador ha bloqueado el micrófono. Permítelo para hablar con el visor."
            : `Micrófono detenido: ${event.error}.`,
        );
      };
      rec.onend = () => {
        setListening(false);
        active.current = null;
      };
      setError("");
      setListening(true);
      setStatus("Escuchando…");
      rec.start();
    } catch {
      setListening(false);
      active.current = null;
      setStatus("No se pudo iniciar el micrófono.");
    }
  }, [Speech]);

  const stop = useCallback(() => {
    const rec = active.current;
    active.current = null;
    setListening(false);
    setStatus((current) => (current.startsWith("Escuchando") ? "" : current));
    rec?.stop();
  }, []);

  return { supported: Boolean(Speech), listening, status, error, start, stop };
}
