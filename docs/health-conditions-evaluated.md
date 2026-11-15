# Condiciones y variables evaluadas por LIGHTMINUTE

> Proyecto **LIGHTMINUTE** (NASA Space Apps 2026, challenge "Health Monitoring for Astronauts").
> **No es un dispositivo médico.** Todos los datos de tripulación son **sintéticos**; los datos
> públicos (NOAA, DONKI, MMASH) están etiquetados `real-public` / `proxy`. Nada aquí es
> diagnóstico ni tratamiento.

---

## 1. Indicadores biométricos (entrada del motor)

Seis indicadores por tripulante, uno por día, con rango Tierra/espacio y riesgo HRP asociado
(`kb/thresholds.json`):

| Indicador | Unidad | Riesgo HRP | Hazard espacial | Rango Tierra (ref.) | Rol |
|---|---|---|---|---|---|
| `rest_hr` | bpm | cardiovascular | gravedad alterada | 60 – 100 | Frecuencia cardíaca en reposo |
| `temp_c` | °C | inmune | gravedad alterada | 36.1 – 37.5 | Temperatura central (estudio HRP activo) |
| `sleep_h` | h | behavioral | aislamiento | 7.0 – 9.0 | Horas de sueño |
| `pvt_ms` | ms | behavioral | entorno cerrado | sin rango fijo (solo baseline personal) | Tiempo de reacción (PVT) |
| `co2_ppm` | ppm | behavioral | entorno cerrado | techo demo 5 000 (no verificado vs NASA-STD-3001) | CO₂ de cabina (exposición compartida) |
| `headache_score` | 0–10 | behavioral | entorno cerrado | techo demo 3 | Auto-reporte diario (contexto, no diagnóstico) |

Cada lectura pasa por tres lentes: **Tierra** (regla estándar), **Espacio** (regla adaptada) y
**Personal** (baseline N-of-1 del propio tripulante). Los patrones de desacuerdo
(`hidden_in_range`, `expected_for_you`, `space_adapted_normal`, `concordant_alert`,
`learning_baseline`) se muestran en la pantalla *Why*.

---

## 2. Condiciones / síndromes evaluados

Definidos en `kb/syndromes.json` y en los escenarios sintéticos (`services/engine/.../scenarios.py`):

### A. Síndrome febril (fever-like / strain_infection_like)
- Dirección esperada: `rest_hr ↑`, `temp_c ↑`, `sleep_h ↓`, `pvt_ms ↑`.
- Escenario `cmo_fever`: afecta al oficial médico (tripulante A) desde el día 15, con retraso
  de comunicaciones tipo Marte.

### B. Evento de partículas solares con pérdida de sueño (SEP)
- Escenario `sep_sleep_loss`: tormenta solar (escala S de NOAA) desde el día 12, afecta al
  tripulante C; cae el sueño y derivan HR y tiempo de reacción.
- Contexto espacial: escala S de protones (S0–S5) + eventos DONKI (SEP, FLR, CME, GST).

### C. Ascenso lento de CO₂ de cabina (CO₂ creep)
- Escenario `co2_creep`: desde el día 8 el CO₂ sube; varios tripulantes reportan cefalea y
  reacción más lenta. **Exposición compartida**: se revisa el hábitat antes de tratar a nadie.

### D. Patrones clínicos cubiertos por protocolos
(`kb/protocols/`):
- `co2_headache_cluster` — cefalea por CO₂.
- `fever_like_syndrome` — patrón febril.
- `neck_vein_review` — hallazgo de vena yugular (revisión de misión).
- `post_eva_orthostatic` — mareo al ponerse de pie tras EVA.
- `unresponsive_crew` — tripulante no responde (simulacro).

---

## 3. Simulador fisiológico multi-órgano (UI 3D)

`apps/crew-tablet/src/physiology/engine.ts` simula seis sistemas acoplados, con valores nominales
preflight y ajuste por día de misión, g-level, CO₂ de cabina, temperatura ambiente, carga de
ejercicio e hidratación:

| Sistema | Variables principales |
|---|---|
| Cardiovascular | FC, volumen sistólico, gasto cardíaco, PA media, PVC, presión yugular, fracción de volumen plasmático, desplazamiento torácico de fluidos |
| Neuro-ocular | PIC, PIO, presión translaminar, deformación de vaina del nervio óptico, adaptación vestibular, flujo cerebral |
| Pulmonar | FR, volumen tidal, ventilación alveolar, PaCO₂, PaO₂, SpO₂, drive hipercápnico |
| Renal | TFG, diuresis, balance hídrico, supresión de ADH, estimulación de ANP |
| Térmico-metabólico | temperatura central y de piel, calor metabólico, pérdida de calor, deterioro convectivo, desfase circadiano |
| Musculoesquelético | ratio de BMD trabecular, eflujo de calcio, ratio de volumen muscular, fracción de carga mecánica |

Entradas medidas que se inyectan: `rest_hr`, `temp_c`, `co2_ppm`.

---

## 4. Órganos del simulador 3D y su mapeo a variables

`BodyModel3D.tsx` mapea cada órgano a los indicadores/riesgos HRP para resaltar anomalías:

| Órgano / estructura | Variables / riesgos asociados |
|---|---|
| Corazón | `rest_hr`, riesgo cardiovascular |
| Cerebro | `sleep_h`, `pvt_ms`, `headache_score`, riesgos behavioral / sensorimotor |
| Pulmones | `co2_ppm`, riesgos respiratory / environment |
| Riñones (izq/der) | riesgos renal / hidratación |
| Hígado | riesgo immune, CRP, temperatura central |
| Ojos / SANS | riesgo vision, `sans`/`vision_score` |
| Vena yugular / aorta | cefalea, riesgo cardiovascular, desplazamiento de fluidos cefálico |
| Columna / musculoesquelético | riesgos muscular / bone |
| Temperatura central | afecta corazón, cerebro e hígado (strain térmico) |

Órganos GLB disponibles (`organs/`): corazón, cerebro, hígado, pulmón (F/M), riñón izq/der, útero.
Todos bajo CC BY 4.0 (HRA/HuBMAP, NIH 3D). Ver `docs/organ-models-licenses.md`.

---

## 5. Condiciones ambientales y espaciales (clima de misión)

- **CO₂ de cabina** (`co2_ppm`): ascenso lento, exposición compartida.
- **Temperatura ambiente** de cabina (22.5 °C por defecto en el simulador).
- **Nivel de gravedad** (`gLevel`, por defecto 0.0 = microgravedad ISS).
- **Carga de ejercicio** y **factor de hidratación**.
- **Día de misión** (1…N) y perfil de retraso de comunicaciones (Moon/Mars).
- **Tiempo espacial (space weather)**:
  - Flujo de protones GOES (NOAA, S0–S5) — `real-public`.
  - Eventos DONKI (SEP, FLR, CME, GST) 2026-08-16..2026-11-14 — `real-public`.
  - Usados como contexto; **no** elevan alertas por sí solos y no se infiere dosis individual.
- **Contexto de EVA** (días 11–13 en el escenario SEP).

---

## 6. Riesgos del Human Research Program (HRP) mapeados

`hrp_risk` por indicador / componente:
- **cardiovascular** — gravedad alterada.
- **immune** — gravedad alterada (temperatura, reactivación viral).
- **behavioral** — aislamiento / entorno cerrado (sueño, PVT, CO₂, cefalea).
- **vision** — SANS (presión intraocular, ONSD).
- **renal** — hidratación / volumen urinario.
- **respiratory / environment** — CO₂ de cabina.
- **muscular / bone** — atrofia, carga mecánica.
- **sensorimotor** — adaptación vestibular.

Hazards espaciales (5): radiación, aislamiento/confinamiento, distancia a la Tierra,
gravedad alterada, entorno hostil/cerrado.

---

## 7. Protocolos de emergencia (ejecutables, cronometrados)

| Protocolo | Trigger |
|---|---|
| Cabin CO₂ headache cluster | ≥2 tripulantes con cefalea el mismo día + CO₂ en ascenso |
| Fever-like pattern check | Patrón febril |
| Neck-vein finding — mission review | Hallazgo de vena yugular |
| Post-EVA dizziness on standing | Mareo al ponerse de pie tras EVA |
| Unresponsive crew — mission drill | Tripulante no responde |

Cada paso está etiquetado `source-published` o `demo-wording`; los de demo no son procedimientos
NASA. Todo queda en la cadena de auditoría y se encola para Tierra.

---

## 8. Etiquetado de datos (invariante del proyecto)

- `synthetic` — tripulación y lecturas generadas.
- `proxy` — MMASH (calibración de intervalos).
- `real-public` — NOAA GOES, DONKI.

Sin datos personales de salud reales. Sin lenguaje de diagnóstico. Cada afirmación cita un
`kb_id` de `kb/evidence.yaml` o se marca `unverified`.

---

## 9. Fuentes principales

- `kb/thresholds.json`, `kb/syndromes.json`, `kb/evidence.yaml`, `kb/protocols/*.json`
- `services/engine/tether_engine/simulate/scenarios.py`
- `apps/crew-tablet/src/physiology/engine.ts` y `BodyModel3D.tsx`
- `apps/crew-tablet/src/views/{Radiation,Glance,Why,Act}.tsx`
- `ATTRIBUTIONS.md`, `docs/data-card.md`, `docs/model-card.md`, `SENSOR_RESEARCH_LIGHTMINUTE.md`
- `docs/nasa-resources.md` (si se crea) / `docs/organ-models-licenses.md`

> Este documento es descriptivo: las cifras, umbrales y protocolos son los del repositorio en
> su estado actual y deben verificarse contra las fuentes citadas antes de cualquier uso real.
