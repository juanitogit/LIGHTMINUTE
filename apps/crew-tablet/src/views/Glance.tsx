import { AttributionBanner, CrewStrip } from "../components/CrewStrip";
import { Icon } from "../components/Icon";
import { LevelBadge, Panel } from "../components/primitives";
import { fmt, titleFromName } from "../lib/format";
import { crewRoles } from "../lib/meta";
import type { LoadedScenario } from "../lib/types";
import { BodyMap } from "../components/BodyMap";

export function Glance({
  scenario,
  dayNumber,
  crewId,
  onCrew,
  onOpenWhy,
  onOpenAct,
  onOpenIndicator,
}: {
  scenario: LoadedScenario;
  dayNumber: number;
  crewId: string;
  onCrew: (id: string) => void;
  onOpenWhy: () => void;
  onOpenAct: () => void;
  onOpenIndicator: (key: string) => void;
}) {
  const day = scenario.doc.days.find((d) => d.day === dayNumber) ?? scenario.doc.days[0];
  const member = day?.crew?.[crewId] ?? (day ? day.crew[Object.keys(day.crew)[0] ?? ""] : undefined);
  const title =
    scenario.doc.meta?.title ?? scenario.doc.title ?? titleFromName(scenario.doc.name ?? "");
  const description = scenario.doc.description ?? scenario.doc.meta?.summary ?? null;

  return (
    <div className="view glance">
      <header className="viewhead">
        <div>
          <p className="micro">Glance · 2 seconds</p>
          <h1>{title}</h1>
          {description ? <p className="viewhead__sub">{description}</p> : null}
          <p className="viewhead__meta mono small">
            Day {dayNumber} · {Object.keys(day?.crew ?? {}).length} crew · status is icon, text and
            colour
          </p>
        </div>
      </header>

      <div className="glance__grid">
        <Panel
          className="glance__hero"
          title={`Crew ${crewId} · hazard map`}
          aside={member ? <LevelBadge level={member.level} compact /> : null}
          labelledBy="glance-hero-title"
        >
          {member ? (
            <>
              <p className="glance__headline">{member.card?.headline ?? "No card for this day"}</p>
              <BodyMap
                readings={member.indicators ?? {}}
                crewLabel={`Crew ${crewId}`}
                onOpenIndicator={onOpenIndicator}
              />
              <div className="glance__hero-meta">
                <span className="mono">combined score z {fmt(member.syndrome_z, 1)}</span>
                <span className="mono">confidence {member.card?.confidence ?? "—"}</span>
                {member.learning ? <span className="chip chip--quiet">learning baseline</span> : null}
              </div>
              <div className="glance__actions">
                <button type="button" className="btn btn--primary" onClick={onOpenWhy}>
                  See why <Icon name="arrow" size={16} />
                </button>
                <button type="button" className="btn" onClick={onOpenAct}>
                  Open the action card
                </button>
              </div>
            </>
          ) : (
            <p className="chart-empty">No crew data for day {dayNumber}.</p>
          )}
        </Panel>

        <div className="glance__side">
          <AttributionBanner attribution={day?.attribution} />
          <section aria-labelledby="crew-strip-title">
            <header className="panel__head">
              <h2 className="micro" id="crew-strip-title">
                Crew status
              </h2>
              <p className="muted small">tap a member to open their why-view</p>
            </header>
            {day ? (
              <CrewStrip
                crew={day.crew}
                roles={crewRoles(scenario.doc)}
                selected={crewId}
                onOpen={onCrew}
              />
            ) : null}
          </section>
          <p className="glance__footnote">
            <Icon name="info" size={14} /> One reading is never a verdict: TETHER compares today to
            your own 95% band, then asks the Earth, space and personal lenses separately.
          </p>
        </div>
      </div>
    </div>
  );
}
