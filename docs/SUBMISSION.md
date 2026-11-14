# Submission checklist

Current local review: 2026-11-14. Implemented files and external delivery are separate.
The owner must authorize any push. Do not change visibility, deploy or submit as a
side effect of local checks. Current execution evidence belongs in
[the closing report](CHECKLIST-IMPLEMENTACION-2026-11-14.md).

| Item | State | Evidence / remaining action |
|---|---|---|
| Event | Confirmed by owner | Space Apps Challenge Neiva 2026; official page, eligibility and terms still require external confirmation |
| Repository access | To verify | [Repository](https://github.com/juanitogit/NASA-SPACE-APPS-2026); historical notes say private, current anonymous access not certified here |
| LICENSE | Present | Apache-2.0 text in `LICENSE` |
| Setup and local demo | Documented | `README.md`, `docs/demo-runbook.md`; record executed rehearsal results separately |
| Project description and pitch | Drafts present | `pitch/`; factual/wording review required before recording |
| Video and public link | Local drafts prepared; approval/upload pending | `pitch/demo-assets/tether-demo-30s.mp4` and extended 60s version; confirm applicable format before submitting |
| Screenshots | See closing report | Do not equate draft mockups with captured app states |
| Model/data cards and benchmark | Present | `docs/model-card.md`, `docs/data-card.md`, `docs/validation.md`; synthetic recall is not clinical accuracy |
| AI disclosure, attribution and limits | Present | README, project description, ATTRIBUTIONS |
| Team names and roles | Supplied by owner | Listed below; spelling and roles preserved |
| Current tests and build | See closing report | Local commands and results, not historical 76/77 counts |
| Remote CI | To verify before delivery | Workflow exists; a historical green run does not certify the local final diff |
| Offline rehearsal | See closing report | Embedded prototype, API-off fallback and network-off reload are distinct checks |
| Cutoff | Supplied by owner | 2026-11-15 23:59 America/Bogota (UTC−5); not independently verified |
| Actual submission | Pending | Planned freeze 19:59 and submission 20:59 on November 15; preserve final URL/receipt |

Do not claim diagnosis, clinical validation, NASA endorsement, OSDR/Inspiration4
use, verified space-adapted thresholds or tested live provider access without the
corresponding evidence. All shipped space rules are null. The alpha forgetting
bug **is fixed in the shared engine** and has a regression test; it is not a
remaining submission task. Real public MMASH is a coverage proxy from 22 adults.

## Evento y equipo

**Evento:** Space Apps Challenge Neiva 2026. **Cierre:** 15 de noviembre de 2026, 23:59, America/Bogota (UTC−5). Datos confirmados por el usuario; no se presentan como verificación externa de las bases.

Plan previo al cierre: congelación el 15 de noviembre a las **19:59** y envío previsto a las **20:59**, en la misma zona horaria. Son hitos planificados, no acciones completadas. El propietario conserva la autorización exclusiva del push.

| Integrante | Rol |
|---|---|
| Abel Orlando Ramírez Amaya | Backend & Tester |
| Pablo Trujillo Artunduaga | Backend & Tester |
| Juan Sebastián Tafurth Cortes | DevOps & Documentación |
| Simón Santiago Puentes Peña | Documentación & Base de Datos |
| Juan Esteban Bustos Chilatra | Frontend & Backend & Chatbot |
| José David Correa Núñez | Frontend & DevOps & CI/CD |

## Explanation policy

The LLM must preserve `level` and `confidence` exactly and copy `what_changed`, `do_now`,
`monitor`, `escalate_if` and `ground_message` verbatim from the deterministic
template. It may vary the headline and explanation (`why_it_matters`) without
numbers, subject to verification. Wording filters are defense in depth, not a
semantic clinical guarantee. The product remains a nonclinical prototype.
