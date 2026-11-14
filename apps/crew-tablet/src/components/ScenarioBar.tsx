import { titleFromName } from "../lib/format";
import type { ScenarioSummary } from "../lib/types";
import { CrewPills } from "./CrewPills";
import { Icon } from "./Icon";

export function ScenarioBar({
  scenarios,
  scenarioName,
  onScenario,
  crewIds,
  crew,
  onCrew,
  day,
  maxDay,
  onDay,
  playing,
  onTogglePlay,
}: {
  scenarios: ScenarioSummary[];
  scenarioName: string;
  onScenario: (name: string) => void;
  crewIds: string[];
  crew: string;
  onCrew: (crew: string) => void;
  day: number;
  maxDay: number;
  onDay: (day: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
}) {
  return (
    <div className="scenariobar">
      <div className="scenariobar__row">
        <label className="field">
          <span className="micro">Scenario</span>
          <span className="select">
            <select
              value={scenarioName}
              onChange={(event) => onScenario(event.target.value)}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.name} value={scenario.name}>
                  {scenario.title && scenario.title !== scenario.name
                    ? scenario.title
                    : titleFromName(scenario.name)}
                  {scenario.available === false ? " · demo data" : ""}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={16} />
          </span>
        </label>

        <div className="field field--grow">
          <span className="micro" id="crew-label">
            Crew
          </span>
          <CrewPills crewIds={crewIds} crew={crew} onCrew={onCrew} label="Crew member" />
        </div>
      </div>

      <div className="scenariobar__row scenariobar__row--day">
        <button
          type="button"
          className="icon-btn"
          onClick={onTogglePlay}
          aria-pressed={playing}
          aria-label={playing ? "Pause day playback" : "Play through the days"}
          title={playing ? "Pause" : "Play days"}
        >
          <Icon name={playing ? "pause" : "play"} size={18} />
        </button>

        <label className="scrubber">
          <span className="micro">
            Mission day <span className="scrubber__count">{day} / {maxDay}</span>
          </span>
          <input
            type="range"
            min={1}
            max={Math.max(1, maxDay)}
            step={1}
            value={day}
            aria-valuetext={`Day ${day} of ${maxDay}`}
            onChange={(event) => onDay(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
