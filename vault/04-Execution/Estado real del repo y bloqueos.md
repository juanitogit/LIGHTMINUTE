---
tags: [exec, status, hub]
status: verified
updated: 2026-11-14
sources: [revisión local del repo 2026-11-14, docs/validation.md, apps/crew-tablet/public/demo-data.json]
---
# Estado real del repo y bloqueos (verificado 14-nov)
> Revisión archivo por archivo de `project/` y de esta bóveda. No es el estado deseado: es lo que existe hoy, comprobado. Reemplaza al [[Board]] del 13-nov como fuente de verdad.
> Contexto de producto: [[Tesis y diferenciadores]] · [[Alcance MoSCoW]] · [[Arquitectura general]] · [[Criterios de jueceo]]

## Resumen en una frase
El **motor y la evidencia científica están construidos y probados**; falta toda la capa de producto (pipeline, API, UI, consola, protocolos) y la capa de entrega (model/data card, pitch, LICENSE).

## 1. Verificado que funciona

| Pieza | Ruta | Nota / prueba |
|---|---|---|
| Baseline N-of-1 (NIG + Student-t + olvido) | [nof1.py](../../project/services/engine/tether_engine/bayes/nof1.py) | [[ADR-002 N-of-1 conjugado]] · [test_nof1.py](../../project/services/engine/tests/test_nof1.py) |
| Score de síndrome + CUSUM | [syndrome.py](../../project/services/engine/tether_engine/bayes/syndrome.py) | [[Resultados de validacion]] · [test_syndrome.py](../../project/services/engine/tests/test_syndrome.py) |
| Atribución de tripulación (individual vs compartido) | [attribution.py](../../project/services/engine/tether_engine/crew/attribution.py) | [test_crew_ground_space.py](../../project/services/engine/tests/test_crew_ground_space.py) |
| Retraso y enrutamiento "a bordo primero" | [delay.py](../../project/services/engine/tether_engine/ground/delay.py) | [[Retraso de comunicaciones]] |
| Escala S NOAA + presupuesto de dosis | [space_weather.py](../../project/services/engine/tether_engine/hazards/space_weather.py) | [[Fuentes de datos]] |
| Auditoría con hash chain | [audit.py](../../project/services/engine/tether_engine/audit.py) | [[Seguridad y etica]] |
| Tres lentes + patrones con nombre | [lenses.py](../../project/services/engine/tether_engine/lenses.py) | [[Demo killer - lentes en desacuerdo]] |
| Umbrales que rechazan lo no etiquetado | [thresholds.py](../../project/services/engine/tether_engine/protocols/thresholds.py) · [thresholds.json](../../project/kb/thresholds.json) | [[Mapa indicador-riesgo]] |
| Plantilla determinista de Decision Card | [templates.py](../../project/services/engine/tether_engine/protocols/templates.py) | [[Decision Card spec]] |
| Verificador del LLM | [verifier.py](../../project/services/engine/tether_engine/llm/verifier.py) | [[ADR-001 Motor decide LLM explica]] · [test_verifier.py](../../project/services/engine/tests/test_verifier.py) |
| Cliente DeepSeek (cache-stuffing, effort) | [deepseek_client.py](../../project/services/engine/tether_engine/llm/deepseek_client.py) | [[ADR-003 Cache-stuffing de la KB]] · [[DeepSeek V4.1 Flash - guia]] |
| Simulador mínimo determinista | [mini.py](../../project/services/engine/tether_engine/simulate/mini.py) | skill `synthetic-crew-simulator` |
| Benchmark comparativo A/B/B2/C | [run_all.py](../../project/ml/validation/run_all.py) · [results.json](../../project/ml/validation/results.json) | [validation.md](../../project/docs/validation.md) · [[Resultados de validacion]] |
| Salida real del motor, 24 días × 4 tripulantes | [demo-data.json](../../project/apps/crew-tablet/public/demo-data.json) | contrato: [DEMO_DATA_CONTRACT.md](../../project/docs/DEMO_DATA_CONTRACT.md) |
| Pantalla estrella del demo (autónoma) | [three-lens.html](../../project/apps/crew-tablet/prototype/three-lens.html) | [[Demo killer - lentes en desacuerdo]] |
| KB citada + esquema y prompt de la tarjeta | [evidence.yaml](../../project/kb/evidence.yaml) · [syndromes.json](../../project/kb/syndromes.json) · [schema](../../project/llm/schemas/decision_card.schema.json) · [prompt](../../project/llm/prompts/decision_card.system.md) | [[Decision Card spec]] |
| Orquestación de 7 agentes | [OWNERS.json](../../project/agents/OWNERS.json) · [PLAN](../../project/agents/PLAN.md) · [prompts](../../project/agents/prompts/) | [[Plan 48h]] |
| 12 skills del agente | [.agents/skills](../../project/.agents/skills/) | [[Indice de skills]] |

### Demo killer: confirmado con los datos reales
Extraído de `demo-data.json` (tripulante A, semilla 0): días 8–14 `info` y `concordant_normal`; **día 15** salta a `act` con síndrome 2.66; **día 16** FC **72.59** → Tierra `normal`, personal `unusual_high`, patrón **`hidden_in_range`**, síndrome **3.48** (línea 2.33), atribución `individual`. El día 17 baja a `watch` y el 18 vuelve a `act`: el relato del pitch debe decir "señal sostenida con fluctuación", no "monótona".

## 2. Lo que NO existe todavía
> ⚠️ **Superado el 14-nov:** A1–A4 ya están en `main` (pipeline, QC, escenarios, API, tablet, runner y consola).
> La tabla siguiente describe el repo *antes* de ese merge; se conserva como registro. Ver la actualización al final.

| Falta | Dueño | Dónde iría |
|---|---|---|
| `run_scenario(name, seed, days)` | A1 | `services/engine/tether_engine/pipeline.py` |
| 3 escenarios (`cmo_fever`, `sep_sleep_loss`, `co2_creep`) + variantes leves + `labels.json` | A1 | [simulate/](../../project/services/engine/tether_engine/simulate/) · [data/synthetic/](../../project/data/synthetic/) |
| QC de huecos y artefactos | A1 | `services/engine/tether_engine/qc/` |
| API FastAPI (`/api/health`, `/api/scenario`, `/api/card`, `/api/llm-stats`) | A2 | [api/](../../project/services/engine/tether_engine/api/) |
| Servicio de tarjetas con reintento y fallback + red-team | A2 | `tether_engine/llm/card_service.py` |
| UI real de la tablet (Glance → Why → Act) | A3 | [apps/crew-tablet/](../../project/apps/crew-tablet/) — sin `src/`, sin `package.json` |
| Consola de tierra con retraso | A4 | [ground-console/](../../project/apps/ground-console/) |
| Protocol runner + 3 protocolos | A4 | `packages/protocol-runner/` · `kb/protocols/` |
| Snapshots NOAA/OSDR + data card + model card | A5 | [data/snapshots/](../../project/data/snapshots/) · `docs/data-card.md` · `docs/model-card.md` |
| Validación ampliada (huecos, calibración, circadianos, proxy real) | A5 | [validation.md](../../project/docs/validation.md) |
| README de entrega, pitch, video, Q&A, ATTRIBUTIONS, SUBMISSION | A6 | [README.md](../../project/README.md) · `pitch/` |
| CI, Docker, LICENSE, runbook, e2e | A7 | `.github/` · `docs/demo-runbook.md` |

> Ojo: [FOLDER_STRUCTURE.md](../../project/docs/FOLDER_STRUCTURE.md) describe carpetas (`apps/crew-tablet/src/...`, `features/*`, `ml/notebooks`) que **aún no existen**. Es el plano, no el inventario.
> Los `ALL_PROMPTS.md` de la raíz de la bóveda y de `project/agents/` son copias; la fuente es [agents/prompts](../../project/agents/prompts/).

## 3. Bloqueos del entorno en esta máquina

| Bloqueo | Detalle | Impacto |
|---|---|---|
| ~~Python sin dependencias~~ **resuelto (14-nov)** | venv en `project/.venv` con numpy 2.5.4 y scipy 1.18.1 | `scripts/run_tests.py` → **23/23**; benchmark reproducible |
| Sin repo git | `git init` nunca se ejecutó | `setup_worktrees.sh`, `merge_agents.sh` y `check_ownership.py A3 agent/a3` no pueden funcionar |
| Sin `.env` ni clave | solo [.env.example](../../project/.env.example) | el producto debe funcionar con `LLM_PROVIDER=none` (plantillas); el badge `llm` no se podrá demostrar sin clave |
| Sin dependencias de la tablet | no hay `package.json` en `apps/crew-tablet` | Node 24 / npm 11 sí están: se puede montar Vite + React |

Comando de verificación cuando se resuelva el entorno:
```bash
cd tether-kit/project
python3 scripts/run_tests.py          # esperado: 23/23
bash scripts/check_all.sh             # tests + ownership + validación
```

## 4. Pendientes de honestidad (no cerrar en falso)
- Página oficial del reto y **hora de cierre del evento local**: sin confirmar.
- Texto 2026 de la Judging Guide y T&C (repo público, divulgación de IA).
- Licencia de DeepSeek V4.1; `response_format` JSON sin verificar en un sample real.
- Endpoint de DONKI, rangos NASA-STD-3001, límites de CO₂, subconjunto de OSDR a usar.
- Los 3 umbrales "Earth" de `kb/thresholds.json` son `earth-standard` aproximados; la lente espacial está vacía a propósito.
> Lista viva: [[Lecturas pendientes y verificar]] · Riesgos: [[Riesgos del proyecto]] · Entrega: [[Checklist de entrega]]

## Actualización 14-nov (A5 + A6)
**Ya no falta:** snapshots NOAA + panel de radiación, ingestión verificada por sha256, proxy real MMASH,
benchmark ampliado (calibración 94%, huecos 94→84→74%, baseline 74→82→94%), `docs/model-card.md`,
`docs/data-card.md`, README de entrega, 5 documentos de pitch, `docs/SUBMISSION.md`, `ATTRIBUTIONS.md`,
`docs/ARCHITECTURE.md` con estado por capa y `docs/FOLDER_STRUCTURE.md` regenerado.

**Hallazgo importante:** el motor tiene un defecto real en el factor de olvido (`alpha` no se descuenta).
Cobertura del intervalo 100% → 83% → 56% → 16% al pasar de 23 a 200/500/2000 actualizaciones; en datos
reales MMASH 21,6%, y 93,4% con el parche verificado. Afecta a uso por minuto, no a la cadencia diaria del
benchmark. Petición abierta a A1 en `project/handoff/a5.md`. Ver [[2026-11-14]].

**Merge y publicación (14-nov):** `main` ya integra A1 (pipeline, QC, escenarios), A2 (API y card service),
A3 (tablet Glance→Why→Act) y A4 (protocol runner y consola de tierra). Verificado en el árbol fusionado:
**76/76 tests** y `npm run build` correcto; la validación se regeneró contra el simulador de A1 con cifras
**idénticas** a las publicadas. La bóveda se sincronizó a `vault/` dentro del repo.

**Sigue faltando:** el parche de `alpha` en `bayes/nof1.py` (solicitado a A1), `LICENSE`, capturas, video
y roles del equipo.

## Relacionado
[[00-Home]] · [[Board]] · [[Plan 48h]] · [[Resultados de validacion]] · [[Matriz de superioridad]] · [[Personas]] · [[Pulido visual - plan]] · [[Seguridad y etica]] · [[Guion pitch y video]] · [[2026-11-13]]
