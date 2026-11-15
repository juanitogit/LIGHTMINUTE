# Pruebas QA — LIGHTMINUTE

> Documento de resultados de la campaña de aseguramiento de calidad ejecutada sobre el repositorio completo.
> Todos los datos del producto son sintéticos. LIGHTMINUTE no es un dispositivo médico.

## 1. Identificación de la ejecución

| Campo | Valor |
|---|---|
| Fecha local | 2026-11-14 19:50 (-05, America/Bogota) |
| Fecha UTC | 2026-11-15T00:50:49Z |
| Repositorio | `NASA-SPACE-APPS-2026` (LIGHTMINUTE) |
| Rama | `main` |
| Commit | `630348d5d453f64d379f5a3b0fd2e463c5b933ec` |
| Mensaje del commit | `Invenstigacion de sensores y creacion de los htmls` |
| Versión del motor | `tether-engine 0.1.0` |
| Versión crew tablet | `@lightminute/crew-tablet 0.1.0` |
| Versión ground console | `lightminute-ground-console 0.1.0` |
| Estado del árbol al iniciar | limpio (`git status --porcelain` sin cambios) |

## 2. Localización y entorno de pruebas

| Elemento | Detalle |
|---|---|
| Ubicación física | Estación de trabajo local `pablo-Victus-by-HP-Laptop-16-d0xxx`, Bogotá, Colombia |
| Ruta del proyecto | `/home/pablo/Documents/GitHub/NASA-SPACE-APPS-2026` |
| Sistema operativo | Linux Mint 22.3 “Zena” (base Ubuntu 24.04), kernel `7.0.0-42-generic` |
| Arquitectura | `x86_64` |
| Python | 3.12.3 dentro de `.venv` |
| Node.js | v22.23.4 |
| npm | 10.9.9 |
| pytest | 9.2.0 |
| ruff | 0.17.5 |
| Navegador E2E | Chromium Headless Shell 159.0.8154.6 (Playwright, build v1255) |
| Dependencias clave | numpy 2.5.4, scipy 1.18.1, fastapi 0.163.0, pydantic 2.14.3, openai 3.51.0, psycopg 3.3.9 |
| Servicios externos | Ninguno. Todas las pruebas corren offline con snapshots y datos sintéticos |

### Ajustes de entorno realizados antes de las pruebas

1. `psycopg[binary]` y `python-dotenv` no estaban instalados en `.venv`; se instalaron desde `pyproject.toml`. Sin ellos, `test_api.py` no importaba.
2. El binario `python` no estaba en `PATH`. Se usó `.venv/bin/python` y, para el smoke del tablet, la variable `PYTHON` con la ruta absoluta al intérprete del venv.
3. No había navegador de Playwright ni Google Chrome. Se instaló Chromium headless (`npx playwright install chromium`). El caso de fault-injection que exige `channel: "chrome"` se ejecutó con una copia temporal del script apuntando a Chromium; el comportamiento medido es el mismo.

## 3. Alcance y estrategia

La campaña cubre las cinco capas del producto:

1. **Motor determinista** (`services/engine`): bayes N-of-1, sindrome, QC, pipeline, simulador, lentes y umbrales, atribución crew/ground, clima espacial, base de datos.
2. **Capa LLM y verificador** (`tether_engine/llm`): cliente, prompt, caché de prefijo, verificador, fallback a plantilla, red-team.
3. **API y enlace de misión**: endpoints, sesiones, consentimiento, cola, auditoría, persistencia.
4. **Frontend crew tablet**: typecheck, build de producción, fisiología, OAuth, E2E de navegador real y smoke de integración con API local.
5. **Ground console, harness de validación, fault injection y gobernanza** (vault, ownership, CLI de investigador).

Criterio de aprobado: una prueba pasa solo si su comando termina con código 0 y todas sus aserciones se cumplen. Los fallos del harness de fault injection se registran como hallazgos de seguridad, no como pruebas rotas: el harness está diseñado para exponer comportamientos inseguros.

## 4. Cómo se ejecutaron las pruebas

Todos los comandos se lanzaron desde la raíz del repositorio, salvo donde se indica otro directorio.

```bash
# Motor: runner sin dependencias y pytest
.venv/bin/python scripts/run_tests.py
.venv/bin/python -m pytest -q

# Lint
cd services/engine && ../../.venv/bin/ruff check .

# CLI de investigador
.venv/bin/python tools/researcher/test_researcher.py

# Gobernanza
.venv/bin/python scripts/audit_vault.py
.venv/bin/python scripts/check_ownership.py --overlaps

# Red-team del verificador
PYTHONPATH=services/engine .venv/bin/python -m tether_engine.llm.redteam

# API en modo sin LLM
LLM_PROVIDER=none PYTHONPATH=services/engine .venv/bin/python - <<'PY'
from fastapi.testclient import TestClient
from tether_engine.api.main import app
...
PY

# Tablet
cd apps/crew-tablet
npm run typecheck
npm run build
npm run test:physiology
npm run test:auth
npm run test:e2e:browser
PYTHON=/home/pablo/Documents/GitHub/NASA-SPACE-APPS-2026/.venv/bin/python npm run test:e2e

# Ground console
cd apps/ground-console && npm test

# Validación estadística
.venv/bin/python ml/validation/run_all.py

# Fault injection
.venv/bin/python tests/fault_injection/run.py
```

## 5. Resumen de resultados

| Componente | Comando | Resultado | Estado |
|---|---|---|---|
| Motor — runner propio | `scripts/run_tests.py` | 88/88 funciones de prueba | PASA |
| Motor — pytest | `pytest -q` | 95 passed, 8 subtests passed | PASA |
| Lint Python | `ruff check .` | 2 errores `I001` (imports) | FALLA |
| CLI investigador | `tools/researcher/test_researcher.py` | 7/7 | PASA |
| Vault Obsidian | `scripts/audit_vault.py` | 47 notas, 215 wiki links, 0 problemas | PASA |
| Ownership de agentes | `scripts/check_ownership.py --overlaps` | 9 archivos sin dueño | FALLA |
| Red-team del verificador | `tether_engine.llm.redteam` | 30/30 cartas maliciosas rechazadas | PASA |
| API sin LLM | TestClient, `LLM_PROVIDER=none` | health OK, 3 escenarios, carta template con cita, 404 correcto | PASA |
| Tablet typecheck | `npm run typecheck` | sin errores | PASA |
| Tablet build | `npm run build` | build OK (aviso de chunk >500 kB) | PASA |
| Fisiología | `npm run test:physiology` | 8/8 | PASA |
| OAuth / sesiones | `npm run test:auth` | 12/12 | PASA |
| E2E navegador (build estático) | `npm run test:e2e:browser` | 13/13 | PASA |
| Smoke de integración (build + API local) | `npm run test:e2e` con `PYTHON` | 17/17 grupos | PASA |
| Ground console | `npm test` | 8/8 | PASA |
| Harness de validación | `ml/validation/run_all.py` | completa; regenera `docs/validation.md`, `ml/validation/results.json`, `public/data/validation.json` sin cambios | PASA |
| Fault injection | `tests/fault_injection/run.py` | 16/26 + 2 casos de navegador verificados aparte = 18/27 efectivos | HALLAZGOS |
| Cloudflare Functions | `wrangler pages functions build` | “Compiled Worker successfully” | PASA |

## 6. Detalle por componente y propósito de cada prueba

### 6.1 Motor determinista (`services/engine/tests`)

El runner `scripts/run_tests.py` importa cada archivo `test_*.py` sin pytest y ejecuta toda función `test_*`. pytest descubre además subtests parametrizados, por eso reporta 95 casos frente a 88 funciones.

| Archivo | Qué verifica | Resultado |
|---|---|---|
| `test_nof1.py` | Actualización bayesiana N-of-1: la prior se vence con datos propios, la incertidumbre se ensancha con pocas observaciones, el intervalo no se estrecha de forma deshonesta, CUSUM detecta un cambio pequeño y sostenido, un cambio real se marca con explicación y los días sanos rara vez se marcan. | 6/6 PASS |
| `test_syndrome.py` | El score de síndrome supera a un solo indicador ante un desplazamiento coordinado pequeño, resiste contaminación (update robusto) y mantiene controlada la tasa de falsas alarmas. | 3/3 PASS |
| `test_qc.py` | Limpieza de lecturas: descarta faltantes, NaN, valores imposibles e indicadores desconocidos; tolera `None`; `clean_value` nunca lanza excepción; soporta 40 % de pérdida sin excepciones. | 4/4 PASS |
| `test_pipeline.py` | Escenarios completos: atribución individual vs compartida, `cmo_fever` atribuido al individuo, `co2_creep` confirmado como exposición compartida, export determinista por semilla, archivos exportados cumplen el contrato, baja tasa de falsas alarmas “act” antes del inicio, estado de aprendizaje visible y variantes fuertes llegan a `act` en ≤5 días. | 9/9 PASS |
| `test_simulate.py` | Generación sintética determinista por semilla, etiquetas en sidecar separado y nunca dentro de las lecturas, misma semilla sobrevive a un proceso nuevo, forma/tasa/etiquetado del escenario y que `sep_sleep_loss` produce S-scale y dropouts reales. | 5/5 PASS |
| `test_lenses_thresholds.py` | Carga de umbrales KB etiquetados, patrón `hidden_in_range` y `expected_for_you`, y rechazo de umbrales sin etiqueta o sin fuente. | 3/3 PASS |
| `test_crew_ground_space.py` | Cadena de auditoría detecta manipulación, el retardo de ruta cambia con la distancia, se elige el flujo más reciente del canal, un miembro sano ruidoso no se comparte, S-scale y presupuesto de dosis, y atribución compartida vs individual. | 6/6 PASS |
| `test_space_weather_snapshot.py` | Los snapshots DONKI tienen procedencia y checksums válidos, los fallos se declaran explícitamente y no se sustituyen, y el panel es `real-public`, compacto y sin API key. No llama a NASA. | 3/3 PASS |
| `test_database.py` | La readiness de base de datos es opcional sin configuración, verifica con una consulta y cierra la conexión, y un fallo de conexión no filtra el DSN. | 3/3 PASS |

### 6.2 Capa LLM y verificador

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `test_llm.py` | Sin clave cae a plantilla sin red; `none` hace cero llamadas; el flag `fast` baja effort; el prefijo KB contiene todas las reglas y es byte-idéntico entre llamadas; el texto de inyección queda en el mensaje de usuario; el reintento reinyecta errores, conserva prefijo y solo se permite una vez; rechazo del verificador cae a plantilla; error de transporte cae sin reintento; estadísticas de llamadas, rechazos y fallbacks; carta verificada se usa y cuenta tokens; día/crew inexistente lanza `LookupError`. | 14/14 PASS |
| `test_verifier.py` | Rechaza nivel inválido, número inventado, cita falsa, diagnóstico, lenguaje de dosis, campo desconocido, mensaje de ground >140 caracteres, urgencia rebajada, cita vacía y carta no-objeto; acepta plantillas y negaciones de diagnóstico; una inyección en texto de síntoma no puede bajar urgencia; “do now” exige pasos. | 18/18 PASS |
| Red-team `tether_engine.llm.redteam` | 30 cartas adversariales (números inventados, diagnóstico, dosis, campos extra, inyección, mensaje largo, cita inexistente, nivel inválido). Todas deben ser rechazadas. | 30/30 PASS |

### 6.3 API y enlace de misión

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `test_api.py` | Los cinco endpoints en modo plantilla sin red: health reporta `none` sin filtrar la clave, lista de escenarios del contrato, días y 404, carta template, flag `fast`, validación 422, CORS solo localhost, forma de `llm-stats`. | 10/10 PASS |
| `test_mission_link.py` | Ground solo ve contenido consentido y entregado; la respuesta respeta el retardo; se exige sesión y propiedad del crew; los runs de protocolo son durables y no se filtran entre crew; sesiones y mensajes sobreviven a la recreación del router; logout revoca. | 4/4 PASS |
| Verificación manual API | `LLM_PROVIDER=none`: health `status=ok`, `synthetic=true`, `not_a_medical_device=true`, 3 escenarios, 24 días, carta `template` nivel `act` con 1 cita, escenario desconocido → 404. | PASA |

### 6.4 Crew tablet (`apps/crew-tablet`)

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `npm run typecheck` | TypeScript estricto sobre todo el proyecto (`tsc -b`). | PASS |
| `npm run build` | Compilación de producción `tsc -b && vite build`: 88 módulos, `dist/` generado. Aviso no bloqueante: chunks de 753 kB (`three`) y 415 kB por encima de 500 kB. | PASS con aviso |
| `npm run test:physiology` | Simulador fisiológico: precisión RK4, desplazamiento cardiovascular y presión yugular en microgravedad, ICP/SANS, quimiorreflejo hipercápnico, reflejo de Gauer-Henry, balance térmico, remodelado musculoesquelético y orquestación multiorgánica con adaptador 3D. | 8/8 PASS |
| `npm run test:auth` | Seguridad de Google OAuth y sesiones: cookies, Origin, logout, rutas no reconocidas, revocación, etc. | 12/12 PASS |
| `npm run test:e2e:browser` | Navegador real contra `dist/` sin API (ruta offline documentada): Glance, Why, Act, radiación con eje temporal y procedencia, validación, snapshot contradictorio no confiable, escenario faltante rechazado, CO2 sin payload sustituido, estados vacíos honestos, PVT-B de 10 ensayos, check-in persistente, móvil 390 px sin overflow, cero errores de página. | 13/13 PASS |
| `npm run test:e2e` | Smoke de integración con API local real y `LLM_PROVIDER=none`: anatomía 3D con licencia, fallback sin WebGL, drilldown de señal y tres lentes, checklist y protocol runner, cambio de crew, check-in local, límite de tendencias, snapshot NOAA + DONKI, cohortes y calibración, tres escenarios en días 1/16/24, 10 vistas sin overflow en 375/768/1024/1440 px, tema claro/oscuro, ground console, demo `file://`, login Earth-link, cola autenticada, reporte persistido y logout, UI de producción contra API real sin LLM. | 17/17 grupos PASS |

### 6.5 Ground console (`apps/ground-console`)

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `npm test` (`src/audit.test.mjs`) | La cadena de auditoría del navegador coincide con el hash de Python, los cuerpos canónicos coinciden, la cadena intacta verifica, se detecta payload manipulado y enlace roto, el JSON canónico ordena claves y escapa no-ASCII igual que `ensure_ascii` de Python. | 8/8 PASS |

### 6.6 Validación estadística (`ml/validation/run_all.py`)

Regenera el banco de validación: comparación de métodos (regla poblacional, N-of-1, CUSUM, síndrome), calibración nominal vs cobertura real, robustez a lecturas faltantes (0/20/40 %), longitud de historia personal (3/7/14 días) y límites declarados. Terminó sin error y los tres artefactos generados quedaron idénticos al commit (sin `git diff`). Los números siguen siendo sintéticos y no constituyen validación clínica.

### 6.7 Fault injection (`tests/fault_injection/run.py`)

Inyecta fallos reales en las interfaces y mide si el sistema falla de forma segura. Un FAIL aquí es un hallazgo de seguridad, no una prueba defectuosa.

**Resultado: 16/26 aserciones PASS. Casos FI-26 y FI-27 (navegador) verificados por separado con Chromium: ambos PASS. Total efectivo 18/27, igual al baseline registrado en `docs/safety/`.**

Fallos y errores observados:

| ID | Hallazgo | Severidad |
|---|---|---|
| FI-02 | El verificador acepta un número inventado en el titular (“heart rate 999 bpm”) fuera del campo `facts`. | Alta |
| FI-07 | Una falla de inicialización del cliente LLM lanza `RuntimeError` en vez de degradar a plantilla (ERROR). | Media |
| FI-10 | Un HR faltante se muestra como actual citando el último valor (“HR 59.9 vs your usual band…”). | Alta |
| FI-11 | No se marca un sensor pegado (stuck value) en el pipeline real. | Media |
| FI-13 | Una enfermedad prolongada se normaliza: el p-valor pasa de 6.7e-12 a 0.63 y el baseline sube a 78.26. | Alta |
| FI-15 | Un reintento de entrega duplicada crea un segundo mensaje (no idempotente). | Media |
| FI-20 | Texto conductual sensible oculto en campos permitidos se filtra a través de texto/vitales. | Alta |
| FI-23 | Un escenario lunar recibe contexto `mars_transit` con retardo de 11 min. | Media |
| FI-25 | El fallback estático puede renombrar otro escenario: se pide `co2_creep` y se sirve `cmo_fever` bajo el nombre pedido. | Alta |

Pasan: FI-01, FI-03, FI-04, FI-05, FI-06, FI-08, FI-09, FI-12, FI-14, FI-16, FI-17, FI-18, FI-19, FI-21, FI-22, FI-24, FI-26, FI-27.

Estos hallazgos ya están documentados en `docs/safety/hazard-analysis.md` y en los resultados versionados. La campaña confirma que no hay regresión respecto al baseline.

### 6.8 Gobernanza y herramientas

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `tools/researcher/test_researcher.py` | Contratos del CLI offline: columnas inválidas, timestamps, duplicados, números no finitos, 40 % de faltantes no actualiza modelos, predicciones doradas contra el motor, aislamiento por sujeto, no entrenar con futuro, HTML escapado y determinista. | 7/7 PASS |
| `scripts/audit_vault.py` | Enlaces wiki y de archivo del vault Obsidian, inventario de checklist: 47 notas, 215 wiki links, 46 file links, 51 checklist items, 0 problemas. | PASS |
| `scripts/check_ownership.py --overlaps` | Cada archivo del repo tiene dueño declarado en `agents/OWNERS.json`. 9 archivos nuevos no lo tienen y el comando sale con código 1. | FALLA |
| `wrangler pages functions build` | Compila las Cloudflare Pages Functions de autenticación. | PASS |

## 7. Defectos y observaciones

| # | Severidad | Área | Descripción | Impacto |
|---|---|---|---|---|
| 1 | Media | CI | `ruff check services/engine` falla con 2 `I001` en `tests/test_api.py:2` y `tests/test_database.py:2` (bloques de import sin ordenar). Es corregible con `ruff check --fix`. | Bloquea el job `engine` de CI en este commit. |
| 2 | Media | Gobernanza | `check_ownership.py --overlaps` reporta 9 archivos sin dueño: `PROTOTYPES_REVIEW_LIGHTMINUTE.md`, `SENSOR_RESEARCH_LIGHTMINUTE.md` y 7 HTML de `simulator-prototypes/`. | Bloquea el chequeo de ownership de CI. |
| 3 | Alta | Seguridad clínica | 9 hallazgos abiertos de fault injection (FI-02, 07, 10, 11, 13, 15, 20, 23, 25), detallados arriba. | Comportamientos que el verificador o el pipeline aún no bloquean. |
| 4 | Baja | Build frontend | Chunks de 753 kB (`three`) y 415 kB superan el umbral de aviso de Vite. | Solo rendimiento de carga; no rompe el build. |
| 5 | Baja | Entorno | El smoke `test:e2e` asume `python` en `PATH` o la ruta Windows `.venv/Scripts/python.exe`. En Linux hay que pasar `PYTHON=<ruta>`. | Falla solo por configuración del entorno. |
| 6 | Baja | Entorno | El fault-injection de navegador usa `channel: "chrome"`; sin Google Chrome instalado el caso queda en ERROR. Con Chromium de Playwright pasa. | Dependencia de navegador, no del producto. |

No se detectaron regresiones funcionales: el motor, la API, el tablet y la ground console pasan todas sus suites. La validación estadística regenera exactamente los mismos artefactos.

## 8. Limitaciones de esta campaña

- Todo el entorno es local y offline. No se probaron servicios desplegados, latencia de red real, Postgres real ni Google OAuth contra Google.
- El cliente LLM no se ejercitó contra una clave real de DeepSeek; se usó cliente falso y modo `none`. Los resultados prueban el contrato y el fallback, no la calidad del modelo.
- Los datos son sintéticos y los proxies son públicos. Ningún resultado es validación clínica ni evidencia de eficacia médica.
- El fault injection es un conjunto acotado de fallos sintéticos, no una certificación de seguridad.
- Las pruebas de navegador se ejecutaron con Chromium headless; no cubren Safari, Firefox ni GPU real.
- La campaña no sustituye una revisión clínica ni una auditoría de privacidad.

## 9. Evidencia y reproducibilidad

Artefactos de evidencia que producen estas suites (se regeneran al repetir la campaña):

- `docs/qa/browser-results.json` — resultado del smoke de integración del tablet.
- `docs/safety/fault-injection-results.json` y `.md` — tabla y evidencia cruda del fault injection.
- `docs/screenshots/` y `apps/crew-tablet/screenshots/` — capturas del E2E.
- `docs/validation.md`, `ml/validation/results.json`, `apps/crew-tablet/public/data/validation.json` — validación regenerada sin cambios.

Los archivos generados por esta ejecución se revisaron y se restauraron a su versión versionada para no mezclar ruido de capturas ni el ERROR de navegador del entorno con el código del commit. El único archivo nuevo de la campaña es este documento. Los resultados crudos citados arriba quedan en el historial de la sesión y se reproducen con los comandos de abajo.

Para reproducir desde un checkout limpio:

```bash
make setup
make lint
make test
make validate
cd apps/crew-tablet && npm run build && npm run test:physiology && npm run test:auth
cd apps/crew-tablet && npx playwright install chromium && npm run test:e2e:browser
cd apps/crew-tablet && PYTHON="$PWD/../../.venv/bin/python" npm run test:e2e
cd apps/ground-console && npm test
cd ../.. && .venv/bin/python tests/fault_injection/run.py
```

**Conclusión:** el producto es funcional y consistente en todas sus capas. Las suites de motor, API, tablet y ground console pasan al 100 %. Quedan abiertos dos bloqueos de CI (lint y ownership) y nueve hallazgos de seguridad del fault injection, todos ya trazados en `docs/safety/`. No hay regresiones frente al baseline del commit anterior.
