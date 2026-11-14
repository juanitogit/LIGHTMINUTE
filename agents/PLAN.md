# Plan: 7 agentes en paralelo, 60 minutos

## Regla de oro
Cada agente trabaja en **su propio worktree/rama** (`../tether-a1` … `a7`) y solo puede tocar **sus rutas** (`agents/OWNERS.json`). Si necesita algo de otro, lo escribe en `handoff/aN.md`. Solo A7 hace merge. Un script rechaza ramas que toquen archivos ajenos.

| Agente | Rol | Dueño de | Entrega clave |
|---|---|---|---|
| A1 | Motor y escenarios | `tether_engine/{bayes,crew,ground,hazards,protocols,qc,simulate}`, `pipeline.py`, `kb/thresholds.json`, `data/synthetic`, `public/data/scenario-*` | `run_scenario()` + 3 escenarios JSON |
| A2 | LLM y API | `tether_engine/{llm,api}`, `llm/`, `kb/evidence.yaml` | `/api/*`, tarjetas LLM verificadas + plantilla |
| A3 | UI tablet | `apps/crew-tablet/src`, `user-ui`, `prototype`, `packages/ui-kit` | Glance→Why→Act con datos reales |
| A4 | Protocolos y consola de tierra | `apps/ground-console`, `packages/protocol-runner`, `kb/protocols` | runner de emergencias + consola con retraso |
| A5 | Validación y datos reales | `ml/`, `data/snapshots`, `ingest/`, `docs/{validation,data-card,model-card}.md`, `public/data/{validation,radiation}.json` | benchmark extendido + tarjetas + snapshots NOAA |
| A6 | Docs y pitch | `README.md`, `pitch/`, `docs/SUBMISSION.md`, `ATTRIBUTIONS.md`, vault | descripción del proyecto, guion de video, Q&A jueces |
| A7 | Integrador/QA/DevOps | `.github`, `Dockerfile`, `Makefile`, `tests/`, `.agents/`, `agents/`, contrato | merges, e2e, runbook, tag de entrega |

## Dependencias (crítico)
A1 `pipeline.py` (T+15) → A2 y A3 usan JSON estático hasta entonces. A5 es independiente. A4 solo lee JSON. A3 monta el runner de A4 con `try/catch` (opcional).

## Línea de tiempo
| T+ | Qué pasa |
|---|---|
| 0–5 | Tú: `git init`, `setup_worktrees.sh`, abre 7 sesiones y pega cada prompt (A7 verifica el mapa de propiedad) |
| 5–25 | Todos construyen P0 |
| **25** | **Merge 1** (A7: orden A1, A2, A5, A4, A3, A6) + `check_all.sh` |
| 25–40 | P1 + arreglar integración |
| **40** | **Merge 2** |
| 40–45 | A6 reemplaza placeholders `{{X}}` con cifras de `docs/validation.md` |
| **45** | **Congelación**: solo bugs pedidos por A7 |
| 50–60 | A7 tag `v1.0-submission`, ensayo del demo, video (tú) |

## Cómo lanzar
```bash
cd tether-kit/project
git init && git add -A && git commit -m init
bash scripts/setup_worktrees.sh          # crea ../tether-a1 … ../tether-a7
# 7 terminales: cd ../tether-aN  → abre tu agente (dsh o Claude Code) → pega agents/prompts/AN-*.md
```
Esfuerzo de razonamiento sugerido: A1, A2, A5 `high`; A3, A4, A7 `high`; A6 `low`. Fin de semana = tarifa valle de DeepSeek.

## Si algo falla (recorte de alcance, en este orden)
1. Sin 3D ni silueta: tarjetas y gráficos bastan. 2. Sin runner/consola (A4 P1). 3. Sin pruebas con datos proxy reales (A5 P1): se declara "no realizado". 4. Sin LLM: plantilla (el producto sigue completo).
**Nunca recortes:** validación honesta, etiquetas SYNTHETIC, tests verdes, README/descripción, video.

## Realismo
60 minutos es muy justo. Con este plan se llega a un MVP demostrable, no a un producto pulido. Los agentes pueden equivocarse: tu trabajo es revisar `handoff/*.md` en cada ventana de merge y probar el demo a mano.
