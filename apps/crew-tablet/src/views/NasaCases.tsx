import { useMemo } from "react";
import { Icon } from "../components/Icon";
import { Chip } from "../components/primitives";
import { buildInvestigationScenario } from "../lib/investigationScenarios";
import { NASA_CASES, detectionDay, type NasaCase } from "../lib/nasaCases";

/** Mission schematic: no photography, just an orbit, a vehicle and the case number. */
function MissionPatch({ meta }: { meta: NasaCase }) {
  return (
    <svg className="case-patch" viewBox="0 0 132 84" aria-hidden="true">
      <ellipse cx="66" cy="44" rx="58" ry="22" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <ellipse
        cx="66"
        cy="44"
        rx="58"
        ry="22"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        transform="rotate(-18 66 44)"
      />
      <circle cx="66" cy="44" r="16" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M58 44h16M66 36v16" stroke="currentColor" strokeOpacity="0.5" />
      <text x="66" y="49" textAnchor="middle" fontSize="13" fill="currentColor">
        {meta.number}
      </text>
      <circle cx="112" cy="26" r="4" fill="currentColor" stroke="none" />
      <circle cx="24" cy="62" r="2.4" fill="currentColor" stroke="none" opacity="0.6" />
      <path d="M6 74h120" stroke="currentColor" strokeOpacity="0.25" />
    </svg>
  );
}

export function NasaCases({ current, onLoad }: { current: string; onLoad: (scenario: string) => void }) {
  // The generators are deterministic, so the detection day is stable per case.
  const detection = useMemo(() => {
    const map: Record<string, number | undefined> = {};
    for (const meta of NASA_CASES) {
      map[meta.scenario] = detectionDay(buildInvestigationScenario(meta.scenario), meta.affectedCrew);
    }
    return map;
  }, []);

  return (
    <div className="view nasa-cases">
      <header className="viewhead">
        <div>
          <p className="micro">LIGHTMINUTE / BIBLIOTECA DE CASOS</p>
          <h1>Casos Reales NASA</h1>
          <p className="viewhead__sub">
            Seis eventos clínicos documentados en vuelo espacial, reconstruidos como simulaciones
            sintéticas de 14 días. Cada tarjeta compara la medicina tradicional (tardía) con la
            detección preventiva de LIGHTMINUTE. Ningún dato pertenece a los tripulantes reales.
          </p>
        </div>
        <Chip tone="warn">SYNTHETIC · NASA HRP</Chip>
      </header>

      <div className="case-gallery">
        {NASA_CASES.map((meta) => {
          const detected = detection[meta.scenario];
          const isCurrent = current === meta.scenario;
          return (
            <article key={meta.scenario} className={`case-card ${isCurrent ? "is-current" : ""}`}>
              <div className="case-card__art">
                <MissionPatch meta={meta} />
                <span className="case-card__num">CASO {meta.number}</span>
              </div>

              <div className="case-card__body">
                <p className="micro">
                  {meta.mission} · {meta.year}
                </p>
                <h2>{meta.short}</h2>
                <p className="case-card__title">{meta.title}</p>
                <p className="case-card__crew">
                  <Icon name="visor" size={13} /> {meta.astronauts}
                </p>
                <p className="case-card__dilemma">{meta.dilemma}</p>

                <div className="case-compare">
                  <div className="case-compare__col case-compare__col--late">
                    <span className="micro">MEDICINA TRADICIONAL · TARDÍA</span>
                    <p>{meta.traditional}</p>
                  </div>
                  <div className="case-compare__col case-compare__col--lm">
                    <span className="micro">LIGHTMINUTE · PREVENTIVA</span>
                    <p>{meta.lightminute}</p>
                  </div>
                </div>

                <div className="case-card__foot">
                  <div className="case-card__tags">
                    {detected ? <Chip tone="quiet">Día {detected} · primera desviación</Chip> : null}
                    <Chip tone="quiet">{meta.protocol}</Chip>
                  </div>
                  <button type="button" className="btn btn--primary" onClick={() => onLoad(meta.scenario)}>
                    {isCurrent ? "Caso cargado · abrir Glance" : "Cargar este caso"}
                    <Icon name="arrow" size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="glance__footnote">
        Evidencia citada: NASA Human Research Program y New England Journal of Medicine. Los
        escenarios son sintéticos y no sustituyen historia clínica ni consejo médico.
      </p>
    </div>
  );
}
