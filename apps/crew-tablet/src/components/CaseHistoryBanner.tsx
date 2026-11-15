import { Icon } from "./Icon";
import { detectionDay, type NasaCase } from "../lib/nasaCases";
import type { ScenarioDoc } from "../lib/types";

/** Historical references accompany a synthetic scenario in the normal overview. */
export function CaseHistoryBanner({ meta, doc, onDetect }: {
  meta: NasaCase;
  doc: ScenarioDoc;
  onDetect: (day: number, crew: string) => void;
}) {
  const detected = detectionDay(doc, meta.affectedCrew);
  const affected = meta.affectedCrew[0];
  return (
    <section className="case-context" aria-labelledby="case-context-title">
      <div className="case-context__heading">
        <div>
          <p className="micro">HISTORICAL CONTEXT / SYNTHETIC SCENARIO</p>
          <h2 id="case-context-title">{meta.mission.replace("Expedición", "Expedition")} <span>· {meta.year}</span></h2>
        </div>
        {detected && affected ? (
          <button type="button" className="text-action" onClick={() => onDetect(detected, affected)}>
            Explore simulated alert · day {detected} <Icon name="arrow" size={15} />
          </button>
        ) : null}
      </div>
      <p>{doc.description ?? "This synthetic scenario is informed by a historical spaceflight event."}</p>
      <p className="small muted">The readings are generated for demonstration; they are not the astronauts’ medical records or evidence of real-world detection.</p>
      <details className="case-context__sources">
        <summary>Historical sources</summary>
        <ul>
          {meta.citations.map((citation) => (
            <li key={citation.text}>
              <span>{citation.text}</span>{" "}
              {citation.url ? <a href={citation.url} target="_blank" rel="noreferrer">{citation.source} ↗</a> : <span className="muted">{citation.source}</span>}
            </li>
          ))}
        </ul>
        <p className="small muted">Evidence reference: <span className="mono">{meta.evidenceId}</span></p>
      </details>
    </section>
  );
}
