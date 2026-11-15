import { useEffect, useMemo, useState } from "react";
import { CrewSelector } from "./components/CrewSelector";
import { Brand } from "./components/Brand";
import { StartupMotion } from "./components/StartupMotion";
import { Icon, type IconName } from "./components/Icon";
import { Chip, DataNotice, EmptyState, Panel } from "./components/primitives";
import { ScenarioBar } from "./components/ScenarioBar";
import { useExplainedCard, useScenarioData } from "./hooks/useScenarioData";
import { useHashState, type View } from "./hooks/useHashState";
import { FALLBACK_SCENARIOS, loadHealth, loadScenarioIndex } from "./lib/api";
import { fmtDay, fmtDelay, titleFromName } from "./lib/format";
import type { ApiHealth, DecisionCard, ScenarioSummary } from "./lib/types";
import { Act } from "./views/Act";
import { DataSources } from "./views/DataSources";
import { Glance } from "./views/Glance";
import { Radiation } from "./views/Radiation";
import { Validation } from "./views/Validation";
import { CheckIn } from "./views/CheckIn";
import { MissionWorkspace } from "./views/MissionWorkspace";
import { SignalLibrary } from "./views/SignalLibrary";
import { EarthLink } from "./views/EarthLink";
import { Why } from "./views/Why";
import { VisorHud } from "./views/VisorHud";

const VIEW_LABELS: { id: View; label: string; detail: string; icon: IconName }[] = [
  { id: "glance", label: "Overview", detail: "Glance", icon: "overview" },
  { id: "why", label: "Personal baseline", detail: "Why", icon: "pulse" },
  { id: "act", label: "Actions", detail: "Act", icon: "check" },
  { id: "radiation", label: "Space weather", detail: "NASA + NOAA", icon: "orbit" },
  { id: "today", label: "Today & check-in", detail: "Today", icon: "check" },
  { id: "signals", label: "Signal library", detail: "Signals", icon: "pulse" },
  { id: "trends", label: "Mission trends", detail: "Trends", icon: "chart" },
  { id: "handbook", label: "Onboard handbook", detail: "Ask", icon: "info" },
  { id: "earth", label: "Earth link", detail: "Earth", icon: "earth" },
  { id: "validation", label: "Evidence & validation", detail: "Data", icon: "chart" },
  { id: "checkin", label: "PVT & daily log", detail: "Local", icon: "watch" },
  { id: "visor", label: "Visor EVA (HUD)", detail: "HUD", icon: "visor" },
];

const FALLBACK_CREW = ["A", "B", "C", "D"];
const PLAY_MS = 1400;

function readStoredTheme(): "dark" | "light" {
  try {
    if (window.localStorage.getItem("lightminute-design-version") !== "2") return "light";
    const stored = window.localStorage.getItem("lightminute-theme") ?? window.localStorage.getItem("tether-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage disabled */
  }
  return "light";
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
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    try {
      window.localStorage.setItem("lightminute-theme", theme);
      window.localStorage.setItem("lightminute-design-version", "2");
      window.localStorage.removeItem("tether-theme");
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
    enabled: apiOnline && scenario.data?.origin !== "browser-engine" && state.view === "act" && Boolean(member?.card),
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
      return;
    }
    const timer = window.setInterval(() => {
      const next = day >= maxDay ? 1 : day + 1;
      update({ day: next });
    }, PLAY_MS);
    return () => window.clearInterval(timer);
  }, [playing, day, maxDay, update]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || target?.closest(".protocol-host")) return;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
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
        ? scenario.data?.origin === "browser-engine" ? "engine API offline · on-device engine" : "engine API offline · static JSON"
        : `engine API online${
            health.llm_provider && health.llm_provider !== "none"
              ? ` · ${health.llm_provider} ${health.llm_model ?? ""}`.trim()
              : " · LLM off, template cards"
          }`;


  return (
    <div className={`app ${state.pres ? "is-present" : ""}`}>
      <StartupMotion />
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className="sidebar" aria-label="Mission workspace">
        <Brand />
        <p className="sidebar__label micro">Crew workspace</p>
        <nav className="views" aria-label="Views">
          {VIEW_LABELS.map(({ id, label, detail, icon }) => (
            <button key={id} type="button" className={`views__btn views__btn--${id} ${state.view === id ? "is-active" : ""}`} aria-current={state.view === id ? "page" : undefined} onClick={() => goView(id)}>
              <Icon name={icon} size={19} /><span>{label}</span><span className="views__detail">{detail}</span>
            </button>
          ))}
          <details className="mobile-more"><summary>More</summary><div>{VIEW_LABELS.filter(v=>!["glance","today","act","earth"].includes(v.id)).map(v=><button type="button" key={v.id} onClick={e=>{goView(v.id);e.currentTarget.closest("details")?.removeAttribute("open");}}>{v.label}</button>)}</div></details>
        </nav>
        <div className="sidebar__bottom">
          <div className="ground-connection"><Icon name="earth" size={19} /><div><p>Ground round trip</p><strong>{fmtDelay(member?.routing?.expected_reply_s)}</strong><span> simulated</span></div></div>
          <DataNotice />
          <p className="sidebar__edition mono">LIGHTMINUTE / RESEARCH EDITION</p>
        </div>
      </aside>

      <div className="workspace">
      <div className="chrome">
        <header className="topbar">
          <div className="topbar__breadcrumb"><span className="mobile-brand">LIGHTMINUTE</span><span>Crew health</span><span aria-hidden="true">/</span><b>{state.view === "sources" ? "Data sources" : VIEW_LABELS.find((v) => v.id === state.view)?.label}</b></div>

          <div className="topbar__tools">
            <span className={`engine-badge ${health ? "is-online" : ""}`}><span className="status__dot" />{health ? "Engine connected" : health === undefined ? "Connecting…" : "Local simulation"}</span>
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
              <Icon name="play" size={14} /> Present
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
        <div className="engine-local-control"><button type="button" className="btn" disabled={scenario.computing || scenario.phase !== "ready"} onClick={scenario.runOnDevice}>{scenario.computing ? "Preparing on-device engine…" : "Run engine on this device"}</button><p className="small muted">Optional synthetic Python engine: first use downloads up to {(__LIGHTMINUTE_ENGINE_MANIFEST__.total / 1048576).toFixed(1)} MiB. Once prepared, it can run offline.</p>{scenario.computing?<p role="status" aria-live="polite">{scenario.computeProgress}</p>:null}{scenario.computeError?<p role="alert">{scenario.computeError}</p>:null}</div>
        <div className="mobile-notice">
          <Chip tone="warn">SYNTHETIC DATA</Chip>
          <Chip tone="quiet">not a medical device</Chip>
          {health === null ? <Chip tone="quiet">{scenario.data?.origin === "browser-engine" ? "on-device engine · API off" : "static JSON · API off"}</Chip> : null}
        </div>
      </div>
      <main id="main" className="main" tabIndex={-1}>
        {state.view !== "sources" && scenario.phase === "loading" ? (
          <div className="view">
            <Panel>
              <p className="muted" role="status">Loading {titleFromName(scenarioName)}…</p>
              <div className="skeleton" aria-hidden="true" />
            </Panel>
          </div>
        ) : null}

        {state.view !== "sources" && scenario.phase === "error" ? (
          <div className="view">
            <Panel title="Scenario could not load" labelledBy="load-error">
              <EmptyState title="No data source reachable">
                <p>
                  The mission data is unavailable. Check your connection and try again.
                </p>
                <p className="mono small">{scenario.error}</p>
              </EmptyState>
              <button type="button" className="btn btn--primary" onClick={scenario.reload}>
                Try again
              </button>
            </Panel>
          </div>
        ) : null}

        {state.view !== "sources" && scenario.phase === "ready" && scenario.data && doc ? (
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
                onCrew={goCrew}
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
                      <CrewSelector crewIds={crewIds} crew={crew} onCrew={goCrew} />
                    </div>
                  </Panel>
                </div>
              )
            ) : null}

            {(["today","trends","handbook"] as string[]).includes(state.view) ? <MissionWorkspace scenario={scenario.data} crewId={crew} dayNumber={day} mode={state.view as "today"|"trends"|"handbook"} /> : null}
            {state.view === "signals" ? <SignalLibrary scenario={scenario.data} crewId={crew} dayNumber={day} /> : null}
            {state.view === "earth" ? <EarthLink scenario={scenario.data} crewId={crew} dayNumber={day} /> : null}
            {state.view === "radiation" ? <Radiation /> : null}
            {state.view === "validation" ? <Validation /> : null}
          </>
        ) : null}

        {/* Local-only tools: they must work even when no scenario loads. */}
        {state.view === "checkin" ? <CheckIn /> : null}
        {state.view === "sources" ? <DataSources /> : null}
        {state.view === "visor" ? (
          <VisorHud
            scenario={scenario.data}
            dayNumber={day}
            crewId={crew}
            crewIds={crewIds}
            onCrew={goCrew}
            onDay={(next) => update({ day: next })}
            maxDay={maxDay}
            onOpenTablet={() => goView("glance")}
          />
        ) : null}
      </main>

      <footer className="statusbar">
        <button type="button" className="btn" onClick={() => goView("sources")}>Data sources</button>
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
    </div>
  );
}
