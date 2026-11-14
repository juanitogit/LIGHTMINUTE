import { LEVEL_COPY } from "../lib/meta";
import { fmt } from "../lib/format";
import type { CrewDay, Level } from "../lib/types";
import { Icon } from "./Icon";
import { LevelBadge } from "./primitives";

export function CrewStrip({
  crew,
  selected,
  onOpen,
}: {
  crew: Record<string, CrewDay>;
  selected: string;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="crew-strip">
      {Object.entries(crew).map(([id, member]) => {
        const level: Level = member.level;
        const isSelected = id === selected;
        return (
          <li key={id}>
            <button
              type="button"
              className={`crew-card crew-card--${level} ${isSelected ? "is-selected" : ""}`}
              aria-pressed={isSelected}
              onClick={() => onOpen(id)}
            >
              <span className="crew-card__top">
                <span className="avatar" aria-hidden="true">
                  {id}
                </span>
                <span className="crew-card__id">Crew {id}</span>
                <LevelBadge level={level} compact />
              </span>

              <span className="crew-card__headline">{member.card?.headline ?? "No card today"}</span>

              <span className="crew-card__meta">
                <span className="mono">z {fmt(member.syndrome_z, 1)}</span>
                {member.learning ? (
                  <span className="chip chip--quiet">
                    <Icon name="clock" size={13} />
                    learning baseline
                  </span>
                ) : null}
                {member.card_source === "llm" ? (
                  <span className="chip chip--accent">DeepSeek</span>
                ) : null}
              </span>

              <span className="crew-card__hint">
                <Icon name="arrow" size={14} /> {LEVEL_COPY[level]?.hint ?? "Open the why-view"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AttributionBanner({
  attribution,
}: {
  attribution: { mode: string; affected: string[]; advice?: string } | undefined;
}) {
  if (!attribution) return null;
  const shared = attribution.mode === "shared";
  const individual = attribution.mode === "individual";

  if (!shared && !individual) {
    return (
      <p className="attribution attribution--none">
        <Icon name="info" size={15} /> No crew-level pattern today — readings are treated per person.
      </p>
    );
  }

  return (
    <div className={`attribution ${shared ? "attribution--shared" : "attribution--individual"}`}>
      <Icon name="act" size={16} />
      <div>
        <p className="attribution__title">
          {shared ? "Shared crew pattern" : "Individual pattern"}
          {attribution.affected.length > 0 ? ` ·  crew ${attribution.affected.join(", ")}` : ""}
        </p>
        {attribution.advice ? <p className="attribution__advice">{attribution.advice}</p> : null}
      </div>
    </div>
  );
}
