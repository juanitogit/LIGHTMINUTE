import { useEffect, useMemo, useState } from "react";
import { loadScenario, requestCard } from "../lib/api";
import type { CardResponse, LoadedScenario } from "../lib/types";

type Phase = "loading" | "ready" | "error";

interface ScenarioState {
  phase: Phase;
  data: LoadedScenario | null;
  error: string | null;
  reload: () => void;
}

/** Loads one scenario; the day/crew UI can render as soon as it resolves. */
export function useScenarioData(name: string, enabled = true): ScenarioState {
  const [nonce, setNonce] = useState(0);
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

  return {
    ...state,
    reload: () => setNonce((n) => n + 1),
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
    if (result.key !== key) return { state: params.enabled ? "loading" : "off", response: null };
    return result.value;
  }, [key, params.enabled, result]);
}

export function clearCardCache() {
  cardCache.clear();
}
