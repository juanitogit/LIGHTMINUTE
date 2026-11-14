import { useEffect, useMemo, useState } from "react";
import { CrewPills } from "./components/CrewPills";
import { Icon } from "./components/Icon";
import { Chip, DataNotice, EmptyState, Panel } from "./components/primitives";
import { ScenarioBar } from "./components/ScenarioBar";
import { useExplainedCard, useScenarioData } from "./hooks/useScenarioData";
import { useHashState, type View } from "./hooks/useHashState";
import { FALLBACK_SCENARIOS, loadHealth, loadScenarioIndex } from "./lib/api";
import { fmtDay, titleFromName } from "./lib/format";
import type { ApiHealth, DecisionCard, ScenarioSummary } from "./lib/types";
import { Act } from "./views/Act";
import { CheckIn } from "./views/CheckIn";
import { Glance } from "./views/Glance";
import { Radiation } from "./views/Radiation";
import { Validation } from "./views/Validation";
import { Why } from "./views/Why";

const VIEW_LABELS: { id: View; label: string }[] = [
  { id: "glance", label: "Glance" },
  { id: "why", label: "Why" },
  { id: "act", label: "Act" },
  { id: "radiation", label: "Radiation" },
  { id: "validation", label: "Validation" },
  { id: "checkin", label: "Check-in" },
];

const FALLBACK_CREW = ["A", "B", "C", "D"];
const PLAY_MS = 1400;

function readStoredTheme(): "dark" | "light" {
  try {
    const stored = window.localStorage.getItem("tether-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage disabled */
  }
  return "dark";
}

export function App() {
  const [state, update] = useHashState();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>(FALLBACK_SCENARIOS);
  const [indexSource, setIndexSource] = useState<"api" | "index" | "defaults" | "loading">("loading");
  const [health, setHealth] = useState<ApiHealth | null | undefined>(undefined);
  const [theme, setTheme] = useState<"dark" | "light">(readStoredTheme);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    // Health first: a missing API disables the API path for this page load, so
    // the static fallback is immediate instead of waiting on a dead proxy.
    loadHealth()
      .then((result) => {
        if (!alive) return null;
        setHealth(result);
        return loadScenarioIndex();
      })
      .then((result) => {
        if (!alive || !result) return;
        setScenarios(result.scenarios);
        setIndexSource(result.source);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("tether-theme", theme);
    } catch {
      /* storage disabled */
    }
  }, [theme]);

  useEffect(() => {
    if (!state.scenario && scenarios.length > 0) {
      update({ scenario: scenarios[0]?.name ?? "cmo_fever" });
    }
  }, [state.scenario, scenarios, update]);

  const scenarioName = state.scenario || scenarios[0]?.name || "cmo_fever";
  const booted = health !== undefined && indexSource !== "loading";
  const scenario = useScenarioData(scenarioName, booted);
  const doc = scenario.data?.doc;

  const crewIds = useMemo(() => {
    const first = doc?.days?.[0];
    const ids = first ? Object.keys(first.crew) : [];
    return ids.length > 0 ? ids : FALLBACK_CREW;
  }, [doc]);

  const maxDay = useMemo(() => {
    const days = doc?.days?.map((d) => d.day) ?? [];
    return days.length > 0 ? Math.max(...days) : 24;
  }, [doc]);

  const day = Math.min(Math.max(1, state.day), maxDay);
  const crew = crewIds.includes(state.crew) ? state.crew : (crewIds[0] ?? "A");
  const indicator = doc?.indicators?.includes(state.indicator)
    ? state.indicator
    : (doc?.indicators?.[0] ?? "rest_hr");

  const dayEntry = doc?.days?.find((d) => d.day === day);
  const member = dayEntry?.crew?.[crew];
  const apiOnline = Boolean(health);

  const explained = useExplainedCard({
    scenario: scenarioName,
    crew,
    day,
    enabled: apiOnline && state.view === "act" && Boolean(member?.card),
  });

  const card: DecisionCard | undefined =
    explained.state === "ready" && explained.response?.card
      ? explained.response.card
      : member?.card;
  const cardSource: string =
    explained.state === "ready" && explained.response?.card_source
      ? explained.response.card_source
      : (member?.card_source ?? "template");

  const protocolIdRaw =
    (typeof member?.protocol_id === "string" ? member.protocol_id : undefined) ??
    (typeof doc?.meta?.protocol_id === "string" ? doc.meta.protocol_id : undefined) ??
    (typeof doc?.meta?.default_protocol === "string" ? doc.meta.default_protocol : undefined);

  useEffect(() => {
    setPlaying(false);
  }, [scenarioName]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const next = day >= maxDay ? 1 : day + 1;
      update({ day: next });
    }, PLAY_MS);
    return () => window.clearInterval(timer);
  }, [playing, day, maxDay, update]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const next = Math.min(maxDay, Math.max(1, day + delta));
        update({ day: next });
      }
      if (event.key.toLowerCase() === "p") {
        update({ pres: !state.pres });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [day, maxDay, state.pres, update]);

  useEffect(() => {
    // The chrome is sticky, so anything but the document top lands under it.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [state.view]);

  const goView = (view: View) => update({ view });
  const goCrew = (id: string) => update({ crew: id });

  const statusText =
    health === undefined
      ? "checking engine API…"
      : health === null
        ? "engine API offline · static JSON"
        : `engine API online${
            health.llm_provider && health.llm_provider !== "none"
              ? ` · ${health.llm_provider} ${health.llm_model ?? ""}`.trim()
              : " · LLM off, template cards"
          }`;


  return (
    <div className={`app ${state.pres ? "is-present" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="chrome">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              <Icon name="info" size={16} />
            </span>
            <span className="brand__text">
              TETHER
              <span className="brand__sub">crew tablet</span>
            </span>
          </div>

          <nav className="views" aria-label="Views">
            {VIEW_LABELS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`views__btn ${state.view === id ? "is-active" : ""}`}
                aria-current={state.view === id ? "page" : undefined}
                onClick={() => goView(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="topbar__tools">
            <DataNotice compact />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
            <button
              type="button"
              className={`btn btn--tiny ${state.pres ? "btn--primary" : ""}`}
              aria-pressed={state.pres}
              onClick={() => update({ pres: !state.pres })}
            >
              Present
            </button>
          </div>
        </header>

        <ScenarioBar
          scenarios={scenarios}
          scenarioName={scenarioName}
          onScenario={(name) => {
            setPlaying(false);
            update({ scenario: name });
          }}
          crewIds={crewIds}
          crew={crew}
          onCrew={goCrew}
          day={day}
          maxDay={maxDay}
          onDay={(next) => {
            setPlaying(false);
            update({ day: next });
          }}
          playing={playing}
          onTogglePlay={() => setPlaying((value) => !value)}
        />
        <div className="mobile-notice">
          <Chip tone="warn">SYNTHETIC DATA</Chip>
          <Chip tone="quiet">not a medical device</Chip>
          {health === null ? <Chip tone="quiet">static JSON · API off</Chip> : null}
        </div>
      </div>              <main id="main" className="main">
        {scenario.phase === "loading" ? (
          <div className="view">
            <Panel>
              <p className="muted" role="status">Loading {titleFromName(scenarioName)}…</p>
              <div className="skeleton" aria-hidden="true" />
            </Panel>
          </div>
        ) : null}

        {scenario.phase === "error" ? (
          <div className="view">
            <Panel title="Scenario could not load" labelledBy="load-error">
              <EmptyState title="No data source reachable">
                <p>
                  TETHER could not reach the engine API or the static scenario files. Start the API
                  (<code>uvicorn tether_engine.api.main:app --port 8000</code>) or serve the build
                  from <code>apps/crew-tablet</code>.
                </p>
                <p className="mono small">{scenario.error}</p>
              </EmptyState>
              <button type="button" className="btn btn--primary" onClick={scenario.reload}>
                Try again
              </button>
            </Panel>
          </div>
        ) : null}

        {scenario.phase === "ready" && scenario.data && doc ? (
          <>
            <div className="banners">
              {scenario.data.degraded &&
              (state.view === "glance" || state.view === "why" || state.view === "act") ? (
                <p className="banner banner--warn" role="note">
                  <Icon name="info" size={16} />
                  <span>
                    <b>Static fallback.</b> {titleFromName(scenarioName)} has no published
                    scenario file yet, so this is the scaffold demo scenario
                    (<span className="mono">{scenario.data.originLabel}</span>). Numbers are real
                    engine output from that file, not a different scenario.
                  </span>
                </p>
              ) : null}
            </div>

            {state.view === "glance" ? (
              <Glance
                scenario={scenario.data}
                dayNumber={day}
                crewId={crew}
                onCrew={(id) => update({ crew: id, view: "why" })}
                onOpenWhy={() => update({ view: "why" })}
                onOpenAct={() => update({ view: "act" })}
                onOpenIndicator={(key) => update({ indicator: key, view: "why" })}
              />
            ) : null}

            {state.view === "why" ? (
              <Why
                scenario={scenario.data}
                dayNumber={day}
                crewId={crew}
                crewIds={crewIds}
                indicator={indicator}
                onIndicator={(key) => update({ indicator: key })}
                onCrew={goCrew}
                onOpenAct={() => update({ view: "act" })}
              />
            ) : null}

            {state.view === "act" ? (
              card && member ? (
                <Act
                  scenario={scenario.data}
                  dayNumber={day}
                  crewId={crew}
                  crewIds={crewIds}
                  onCrew={goCrew}
                  card={card}
                  cardSource={cardSource}
                  explain={explained}
                  routing={member.routing}
                  protocolId={protocolIdRaw}
                />
              ) : (
                <div className="view">
                  <Panel title={`${fmtDay(day)} · crew ${crew}`} labelledBy="act-empty">
                    <EmptyState title="No decision card for this day">
                      <p>Pick another day or crew member. Nothing is generated in the UI.</p>
                    </EmptyState>
                    <div className="chips">
                      <CrewPills crewIds={crewIds} crew={crew} onCrew={goCrew} />
                    </div>
                  </Panel>
                </div>
              )
            ) : null}

            {state.view === "radiation" ? <Radiation /> : null}
            {state.view === "validation" ? <Validation /> : null}
          </>
        ) : null}

        {state.view === "checkin" ? <CheckIn /> : null}
      </main>

      <footer className="statusbar">
        <span className="status">
          <span
            className={`status__dot ${
              health ? "status__dot--ok" : health === null ? "status__dot--off" : "status__dot--wait"
            }`}
            aria-hidden="true"
          />
          {statusText}
        </span>
        {scenario.data ? (
          <span className="mono">
            data · {scenario.data.originLabel}
            {scenario.data.degraded ? " · degraded" : ""}
          </span>
        ) : null}
        {indexSource === "defaults" ? (
          <span className="mono">scenario index not published · planned scenarios</span>
        ) : null}
        <span className="muted">
          engine decides numbers and urgency · template or verified LLM ·{" "}
          <Chip tone="quiet">SYNTHETIC</Chip>
        </span>
      </footer>
    </div>
  );
}
