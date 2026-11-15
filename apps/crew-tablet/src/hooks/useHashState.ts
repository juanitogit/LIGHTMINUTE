import { useCallback, useEffect, useState } from "react";

export const VIEWS = ["glance", "why", "act", "cases", "radiation", "validation", "checkin", "today", "trends", "handbook", "signals", "earth", "sources", "moon", "visor"] as const;
export type View = (typeof VIEWS)[number];

export interface HashState {
  scenario: string;
  crew: string;
  day: number;
  indicator: string;
  view: View;
  pres: boolean;
}

const DEFAULTS: HashState = {
  scenario: "",
  crew: "A",
  day: 1,
  indicator: "rest_hr",
  view: "glance",
  pres: false,
};

function isView(value: string | null): value is View {
  return value !== null && (VIEWS as readonly string[]).includes(value);
}

function parse(hash: string): Partial<HashState> {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const out: Partial<HashState> = {};
  const scenario = params.get("scenario");
  if (scenario) out.scenario = scenario;
  const crew = params.get("crew");
  if (crew) out.crew = crew.toUpperCase().slice(0, 2);
  const day = Number(params.get("day"));
  if (Number.isFinite(day) && day >= 1) out.day = Math.floor(day);
  const indicator = params.get("ind");
  if (indicator) out.indicator = indicator;
  const view = params.get("view");
  if (isView(view)) out.view = view;
  if (params.get("pres") === "1") out.pres = true;
  return out;
}

function write(state: HashState) {
  const params = new URLSearchParams();
  if (state.scenario) params.set("scenario", state.scenario);
  if (state.crew !== DEFAULTS.crew) params.set("crew", state.crew);
  if (state.day !== DEFAULTS.day) params.set("day", String(state.day));
  if (state.indicator !== DEFAULTS.indicator) params.set("ind", state.indicator);
  if (state.view !== DEFAULTS.view) params.set("view", state.view);
  if (state.pres) params.set("pres", "1");
  const hash = params.toString();
  const url = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`;
  try {
    window.history.replaceState(null, "", url);
  } catch {
    // file:// in some browsers refuses replaceState; the app still works.
    window.location.hash = hash;
  }
}

export function useHashState(): [HashState, (patch: Partial<HashState>) => void] {
  const [state, setState] = useState<HashState>(() => ({
    ...DEFAULTS,
    ...parse(window.location.hash),
  }));

  useEffect(() => {
    // A hash change is a full state declaration: keys that were removed must fall
    // back to their defaults instead of keeping the previous view's value.
    const onHashChange = () => setState({ ...DEFAULTS, ...parse(window.location.hash) });
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const update = useCallback((patch: Partial<HashState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      write(next);
      return next;
    });
  }, []);

  return [state, update];
}
