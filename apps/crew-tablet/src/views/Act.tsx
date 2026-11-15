import { useEffect, useRef, useState } from "react";
import { CrewSelector } from "../components/CrewSelector";
import { GroundMessage } from "../components/GroundMessage";
import { Icon } from "../components/Icon";
import { Chip, LevelBadge, Panel } from "../components/primitives";
import { ProtocolRunner } from "../components/ProtocolRunner";
import type { ExplainedCard } from "../hooks/useScenarioData";
import { crewRoles } from "../lib/meta";
import type { DecisionCard, LoadedScenario, Routing } from "../lib/types";
import { readWorkspaceRecord, setWorkspaceAction } from "../lib/workspaceStore";

function CardSourceBadge({
  source,
  explain,
}: {
  source: string;
  explain: ExplainedCard;
}) {
  if (explain.state === "loading") {
    return <Chip tone="accent">Generating explanation…</Chip>;
  }
  if (source === "llm") {
    return (
      <Chip tone="accent" title="The LLM wrote this explanation; a deterministic verifier approved it.">
        Explanation: AI · verified
      </Chip>
    );
  }
  if (explain.state === "failed") {
    return <Chip tone="neutral">AI unavailable · protocol template</Chip>;
  }
  return (
    <Chip tone="neutral" title="Deterministic template filled only with engine numbers.">
      Explanation: protocol template
    </Chip>
  );
}

export function Act({
  scenario,
  dayNumber,
  crewId,
  crewIds,
  onCrew,
  card,
  cardSource,
  explain,
  routing,
  protocolId,
}: {
  scenario: LoadedScenario;
  dayNumber: number;
  crewId: string;
  crewIds: string[];
  onCrew: (id: string) => void;
  card: DecisionCard;
  cardSource: string;
  explain: ExplainedCard;
  routing: Routing;
  protocolId?: string | undefined;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [actionBusy, setActionBusy] = useState(true);
  const [actionError, setActionError] = useState("");
  const day = scenario.doc.days.find((d) => d.day === dayNumber);
  const member = day?.crew?.[crewId];
  const name = scenario.doc.name ?? scenario.doc.scenario ?? "mission";
  const keyPrefix = `${name}|${crewId}|${dayNumber}`;
  const contextRef = useRef(keyPrefix);
  contextRef.current = keyPrefix;
  useEffect(() => {
    let active = true;
    setActionBusy(true); setActionError(""); setChecked([]);
    readWorkspaceRecord(name, crewId, dayNumber).then(record => {
      if (active) setChecked(record?.completed ?? []);
    }).catch(() => { if (active) setActionError("Could not load saved actions on this device."); })
      .finally(() => { if (active) setActionBusy(false); });
    return () => { active = false; };
  }, [name, crewId, dayNumber]);
  const done = card.do_now.filter((step, index) => checked.includes(`${index}:${step}`)).length;
  const level = member?.level ?? card.level;
  const role = crewRoles(scenario.doc)[crewId];

  return (
    <div className="view act">
      <header className="viewhead">
        <div>
          <p className="micro">Act · 30 seconds</p>
          <h1>{card.headline}</h1>
          <div className="viewhead__badges">
            <LevelBadge level={level} />
            <CardSourceBadge source={cardSource} explain={explain} />
            <Chip tone="quiet">confidence {card.confidence}</Chip>
          </div>
        </div>
        <div className="viewhead__tools">
          <CrewSelector crewIds={crewIds} crew={crewId} onCrew={onCrew} />
          {role ? <span className="chip chip--quiet">{role}</span> : null}
        </div>
      </header>

      <div className="act__grid">
        <div className="act__main">
          <Panel
            title={`Do now · ${done}/${card.do_now.length}`}
            aside={<span className="mono small">engine level {level}</span>}
            labelledBy="do-now-title"
            className="act__steps"
          >
            <p className="small muted">Action progress is saved on this device and shared with Today &amp; check-in.</p>
            {actionError ? <p role="alert" className="callout callout--warn">{actionError}</p> : null}
            <ul className="checklist">
              {card.do_now.map((step, index) => {
                const id = `${index}:${step}`;
                const isDone = checked.includes(id);
                return (
                  <li key={id}>
                    <label className={`check ${isDone ? "is-done" : ""}`}>
                      <input
                        type="checkbox"
                        disabled={actionBusy}
                        checked={isDone}
                        onChange={(event) => {
                          const next = event.target.checked;
                          const savingContext = keyPrefix;
                          setActionBusy(true); setActionError("");
                          void setWorkspaceAction(name, crewId, dayNumber, id, next).then(() => {
                            if (contextRef.current === savingContext) setChecked(prev => next ? [...new Set([...prev, id])] : prev.filter(item => item !== id));
                          }).catch(() => { if (contextRef.current === savingContext) setActionError("Could not save this action on the device."); })
                            .finally(() => { if (contextRef.current === savingContext) setActionBusy(false); });
                        }}
                      />
                      <span className="check__box" aria-hidden="true">
                        <Icon name="check" size={16} />
                      </span>
                      <span className="check__text">{step}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {done === card.do_now.length ? (
              <p className="callout callout--ok" role="status">
                All steps checked. Keep the card open and send the ground update below.
              </p>
            ) : null}
          </Panel>

          <div className="act__pair">
            <Panel title="What changed" labelledBy="changed-title">
              <p>{card.what_changed}</p>
            </Panel>
            <Panel title="Why it matters" labelledBy="why-title">
              <p>{card.why_it_matters}</p>
            </Panel>
          </div>

          <Panel title="Escalate if" labelledBy="escalate-title">
            <ul className="plain-list plain-list--warn">
              {card.escalate_if.map((item) => (
                <li key={item}>
                  <Icon name="act" size={15} /> {item}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <aside className="act__side">
          <Panel title="Message to ground" labelledBy="ground-title">
            <GroundMessage key={keyPrefix} message={card.ground_message} routing={routing} />
          </Panel>

          <Panel title="Keep monitoring" labelledBy="monitor-title">
            <div className="chips">
              {card.monitor.map((item) => (
                <Chip key={item}>{item}</Chip>
              ))}
            </div>
          </Panel>

          <Panel
            title="Citations"
            aside={<span className="mono small">{card.citations.length}</span>}
            labelledBy="cite-title"
          >
            <ul className="citations">
              {card.citations.map((id) => (
                <li key={id}>
                  <span className="mono">{id}</span>
                </li>
              ))}
            </ul>
            <p className="muted small">
              Claims cite the project knowledge base. Unknown stays unknown — nothing is invented.
            </p>
          </Panel>

          <ProtocolRunner key={keyPrefix} protocolId={protocolId} crewId={crewId} />
        </aside>
      </div>

      <p className="act__footnote">
        <Icon name="info" size={14} /> The deterministic engine decided these numbers and this
        urgency. The explanation — template or verified AI output — cannot change them.
      </p>
    </div>
  );
}
