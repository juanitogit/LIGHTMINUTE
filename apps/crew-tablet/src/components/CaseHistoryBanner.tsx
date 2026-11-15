import { Icon } from "./Icon";
import { detectionDay, type NasaCase } from "../lib/nasaCases";
import type { ScenarioDoc } from "../lib/types";

/**
 * Historical context card shown at the top of Glance for the six NASA cases.
 * Two lines: the real mission and its medical dilemma, then what LIGHTMINUTE
 * saw and on which mission day.
 */
export function CaseHistoryBanner({ meta, doc, onDetect }: {
  meta: NasaCase;
  doc: ScenarioDoc;
  onDetect: (day: number) => void;
}) {
  const detected = detectionDay(doc, meta.affectedCrew);

  return (
    <section className="case-banner" aria-labelledby="case-banner-title">
      <div className="case-banner__main">
        <p className="case-banner__badge">
          <Icon name="microscope" size={13} />
          CONTEXTO HISTÓRICO REAL · CASO {meta.number} DE 6
        </p>
        <h2 id="case-banner-title">
          {meta.mission} <span>({meta.year})</span>
        </h2>
        <p className="case-banner__line">
          <b>{meta.astronauts}</b> · {meta.short} · {meta.affectedLabel}. {meta.dilemma}
        </p>
        <p className="case-banner__line case-banner__line--ln">
          <b>LIGHTMINUTE:</b> {meta.lightminute}
          {detected ? <> Detectado el <b>día {detected}</b>.</> : null}
        </p>
      </div>
      <div className="case-banner__actions">
        {detected ? (
          <button type="button" className="btn btn--primary case-banner__cta" onClick={() => onDetect(detected)}>
            Ver cómo LIGHTMINUTE lo detectó a tiempo
            <Icon name="arrow" size={15} />
          </button>
        ) : null}
        <p className="small muted">
          Caso sintético construido sobre evidencia publicada · {meta.evidenceId}
        </p>
      </div>
    </section>
  );
}
