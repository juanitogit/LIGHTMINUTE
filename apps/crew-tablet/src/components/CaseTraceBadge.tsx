import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import type { NasaCase } from "../lib/nasaCases";

/**
 * Topbar traceability badge: opens the verified citation behind the case.
 * Renders nothing unless a NASA investigation case is active.
 */
export function CaseTraceBadge({ meta }: { meta?: NasaCase }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!meta) return null;

  return (
    <>
      <button
        type="button"
        className="trace-badge"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Ver la cita histórica y la evidencia de este caso"
      >
        [ CASO REAL HISTÓRICO · {meta.traceLabel} ]
      </button>

      {open ? (
        <div className="case-modal" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="case-modal__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="case-modal__head">
              <div>
                <p className="micro">TRAZABILIDAD · CASO {meta.number} DE 6</p>
                <h2 id="case-modal-title">{meta.title}</h2>
                <p className="small muted">
                  {meta.mission} ({meta.year}) · {meta.astronauts}
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setOpen(false)}
                aria-label="Cerrar la cita del caso"
              >
                <Icon name="close" size={16} />
              </button>
            </header>

            <ul className="case-modal__cites">
              {meta.citations.map((citation) => (
                <li key={citation.text}>
                  <p>{citation.text}</p>
                  <p className="micro">
                    {citation.source}
                    {citation.url ? (
                      <>
                        {" · "}
                        <a href={citation.url} target="_blank" rel="noreferrer">
                          fuente
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>

            <p className="small muted">
              Id de evidencia en la KB: <span className="mono">{meta.evidenceId}</span> · datos del simulador
              sintéticos, no historia clínica de los tripulantes reales.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
