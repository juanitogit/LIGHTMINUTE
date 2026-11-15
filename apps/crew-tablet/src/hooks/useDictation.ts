import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> };
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
export function useDictation(onText: (text: string) => void, language: "en" | "es") {
  const active = useRef<Recognition | null>(null);
  const handler = useRef(onText);
  handler.current = onText;
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
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
      rec.lang = language === "es" ? "es-CO" : "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      let delivered = false;
      rec.onresult = (event) => {
        const text = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        setTranscript(text);
        const finalText = Array.from(event.results).filter(result => result.isFinal).map(result => result[0]?.transcript ?? "").join(" ").trim();
        if (finalText && !delivered) { delivered = true; handler.current(finalText); }
      };
      rec.onerror = (event) => {
        setError(event.error);
        setStatus(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "The browser blocked the microphone. Allow access to speak to the visor."
            : `Microphone stopped: ${event.error}.`,
        );
      };
      rec.onend = () => {
        if (active.current === rec) {
          setListening(false);
          active.current = null;
        }
      };
      setError("");
      setListening(true);
      setTranscript("");
      setStatus("Listening…");
      rec.start();
    } catch {
      setListening(false);
      active.current = null;
      setStatus("Could not start the microphone.");
    }
  }, [Speech, language]);

  const stop = useCallback(() => {
    const rec = active.current;
    active.current = null;
    setListening(false);
    setStatus((current) => (current.startsWith("Listening") ? "" : current));
    rec?.stop();
  }, []);

  return { supported: Boolean(Speech), listening, status, error, transcript, start, stop };
}
