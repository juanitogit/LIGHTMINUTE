import { useEffect, useMemo, useRef, useState } from "react";
import { loadScenario, requestCard } from "../lib/api";
import type { CardResponse, LoadedScenario } from "../lib/types";

type Phase = "loading" | "ready" | "error";

interface ScenarioState {
  phase: Phase;
  data: LoadedScenario | null;
  error: string | null;
  reload: () => void;
  runOnDevice: () => void;
  computing: boolean;
  computeProgress: string;
  computeError: string | null;
}

/** Loads one scenario; the day/crew UI can render as soon as it resolves. */
export function useScenarioData(name: string, enabled = true): ScenarioState {
  const [nonce, setNonce] = useState(0);
  const [computing, setComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState("");
  const [computeError, setComputeError] = useState<string|null>(null);
  const workerRef = useRef<Worker|null>(null);
  const [state, setState] = useState<{ phase: Phase; data: LoadedScenario | null; error: string | null }>({
    phase: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState({ phase: "loading", data: null, error: null });
    loadScenario(name)
      .then((data) => {
        if (alive) setState({ phase: "ready", data, error: null });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setState({
          phase: "error",
          data: null,
          error: error instanceof Error ? error.message : "Scenario could not be loaded",
        });
      });
    return () => {
      alive = false;
    };
  }, [name, nonce, enabled]);

  useEffect(() => { setComputing(false); setComputeError(null); return () => {workerRef.current?.terminate();workerRef.current=null;}; }, [name]);

  return {
    ...state,
    reload: () => setNonce((n) => n + 1),
    computing,
    computeProgress,
    computeError,
    runOnDevice: () => {
      if (computing) return;
      setComputing(true);setComputeError(null);setComputeProgress("Starting worker…");
      const worker = new Worker(new URL("../lib/browserEngine.worker.ts", import.meta.url), {type:"module"});
      workerRef.current=worker;
      const timeout=window.setTimeout(()=>{if(workerRef.current!==worker)return;worker.terminate();workerRef.current=null;setComputing(false);setComputeError("On-device engine took too long to load. Static scenario remains available.");}, 120000);
      const expected=name;
      worker.onmessage = (event:MessageEvent<{ok?:boolean;progress?:string;data?:LoadedScenario["doc"];error?:string}>) => {
        if(workerRef.current===worker && event.data.progress){setComputeProgress(event.data.progress);return;}
        if(workerRef.current!==worker)return;window.clearTimeout(timeout);worker.terminate();workerRef.current=null;setComputing(false);
        if(event.data.ok && event.data.data && event.data.data.scenario===expected) setState({phase:"ready",error:null,data:{doc:event.data.data,origin:"browser-engine",degraded:false,originLabel:"on-device Python engine · synthetic"}});
        else setComputeError(event.data.error || "On-device engine could not verify the scenario.");
      };
      worker.onerror = () => {if(workerRef.current!==worker)return;window.clearTimeout(timeout);worker.terminate();workerRef.current=null;setComputing(false);setComputeError("On-device engine could not load. Static scenario remains available.");};
      worker.postMessage({scenario:expected});
    },
  };
}

const cardCache = new Map<string, CardResponse | null>();

export interface ExplainedCard {
  state: "off" | "loading" | "ready" | "failed";
  response: CardResponse | null;
}

/**
 * Optionally asks the API for an explained card. The deterministic card from the
 * scenario JSON is always rendered first, so the LLM can never block the demo.
 */
export function useExplainedCard(params: {
  scenario: string;
  crew: string;
  day: number;
  enabled: boolean;
}): ExplainedCard {
  const key = `${params.scenario}|${params.crew}|${params.day}`;
  const [result, setResult] = useState<{ key: string; value: ExplainedCard }>({
    key: "",
    value: { state: "off", response: null },
  });

  useEffect(() => {
    if (!params.enabled) {
      setResult({ key, value: { state: "off", response: null } });
      return;
    }
    if (cardCache.has(key)) {
      const cached = cardCache.get(key) ?? null;
      setResult({ key, value: { state: cached ? "ready" : "failed", response: cached } });
      return;
    }
    let alive = true;
    setResult({ key, value: { state: "loading", response: null } });
    requestCard({ scenario: params.scenario, crew: params.crew, day: params.day }).then(
      (response) => {
        cardCache.set(key, response);
        if (alive) {
          setResult({ key, value: { state: response ? "ready" : "failed", response } });
        }
      },
    );
    return () => {
      alive = false;
    };
  }, [key, params.enabled, params.scenario, params.crew, params.day]);

  return useMemo(() => {
    if (!params.enabled) return { state: "off", response: null };
    if (result.key !== key) return { state: params.enabled ? "loading" : "off", response: null };
    return result.value;
  }, [key, params.enabled, result]);
}

export function clearCardCache() {
  cardCache.clear();
}
