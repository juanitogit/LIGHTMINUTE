import type { CrewDay, Level } from "../lib/types";
import { Icon } from "./Icon";
import { LevelBadge } from "./primitives";

export function CrewStrip({
  crew,
  roles = {},
  selected,
  onOpen,
}: {
  crew: Record<string, CrewDay>;
  roles?: Record<string, string>;
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
              className={`crew-row crew-row--${level} ${isSelected ? "is-selected" : ""}`}
              aria-pressed={isSelected}
              onClick={() => onOpen(id)}
            >
              <span className="crew-row__top">
                <span className="avatar" aria-hidden="true">
                  {id}
                </span>
                <span className="crew-row__id">Crew {id}</span>
                {roles[id] ? <span className="crew-row__role">{roles[id]}</span> : null}
                <LevelBadge level={level} compact />
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
  // Mode stays "none" while a pattern is still a candidate; the engine's advice
  // carries that nuance, so never overwrite it.

  if (!shared && !individual) {
    return (
      <p className="attribution attribution--none">
        <Icon name="info" size={15} />
        {attribution.advice?.trim()
          ? attribution.advice
          : "No crew-level pattern today — readings are treated per person."}
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
