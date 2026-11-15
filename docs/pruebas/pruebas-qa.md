# Pruebas QA — LIGHTMINUTE

> Documento de resultados de la campaña de aseguramiento de calidad ejecutada sobre el repositorio completo.
> Todos los datos del producto son sintéticos. LIGHTMINUTE no es un dispositivo médico.

## Registro de campañas

| Campaña | Fecha | Commit base | Ejecutó | Estado | Sección |
|---|---|---|---|---|---|
| C1 | 2026-11-14 19:50 (-05) | `630348d` | Agente de IA (campaña previa) | Cerrada | [Campaña 1](#1-identificación-de-la-ejecución) |
| C2 | 2026-11-15 12:20–12:56 (-05) | `3c682ae` | Buffy (Freebuff) · DeepSeek V4.1 Flash Slow | Cerrada | [Campaña 2](#campaña-2--re-ejecución-completa-2026-11-15) |

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

---

# Campaña 2 — Re-ejecución completa (2026-11-15)

> Segunda pasada de QA sobre el estado actual del repositorio. Se ejecutó **sin modificar código**: solo se instaló una dependencia de desarrollo ya declarada y se restauraron los artefactos generados al terminar. No se hizo commit, push ni merge.

## C2-1. Identificación de la ejecución

| Campo | Valor |
|---|---|
| Fecha local | 2026-11-15, 12:20–12:56 (-05, America/Bogota) |
| Fecha UTC de cierre | 2026-11-15T17:56:10Z |
| Repositorio | `NASA-SPACE-APPS-2026` (LIGHTMINUTE / TETHER) |
| Rama | `main` |
| Commit base | `3c682aebb41e1593d6f1fa030852aaac06e74d4f` — `fix: Se corrigieron los visiores` (2026-11-15 12:12 -05) |
| Ejecutó | **Buffy**, agente de IA de Freebuff, sobre **DeepSeek V4.1 Flash Slow** |
| Estado del árbol al iniciar | limpio (`git status --porcelain` vacío) |
| Estado del árbol al cerrar | limpio (artefactos regenerados y restaurados) |
| Versiones | `tether-engine 0.1.0`, `@lightminute/crew-tablet 0.1.0`, `lightminute-ground-console 0.1.0` |

## C2-2. Entorno

| Elemento | Detalle |
|---|---|
| Equipo | `pablo-Victus-by-HP-Laptop-16-d0xxx`, Bogotá, Colombia |
| SO / kernel | Linux Mint 22.3 “Zena” (base Ubuntu 24.04) · `Linux 7.0.0-42-generic` · `x86_64` |
| Python | 3.12.3 en `.venv` |
| Node / npm | v22.23.4 / 10.9.9 |
| pytest / ruff | 9.2.0 / 0.17.5 |
| Librerías | numpy 2.5.4, scipy 1.18.1, fastapi 0.163.0, pydantic 2.14.3 |
| Navegador | Chromium de Playwright (headless); **no** hay Google Chrome instalado |
| Red | Ninguna prueba dependió de servicios externos; snapshots locales |

### Cambios de entorno realizados

1. Se instaló `hypothesis 6.170.15` en `.venv` (ya declarada en `services/engine/pyproject.toml` como dependencia `dev`). Sin ella, `pytest` desde la raíz abortaba la colección de `tests/property/`.
2. Se usó `.venv/bin/python` y `PYTHON=<ruta absoluta>` para el smoke del tablet, porque `python` no está en `PATH`.
3. Se ejecutaron los dos casos de navegador de fault injection con Chromium y una copia temporal del script en `/tmp` (el original exige `channel: "chrome"`).
4. **No se editó ningún archivo versionado.** Los artefactos que las suites regeneran (`docs/validation.md`, `ml/validation/results.json`, `apps/crew-tablet/public/data/validation.json`, `docs/safety/fault-injection-results.*`, capturas y `docs/qa/browser-results.json`, `public/data/radiation.json`, `data/snapshots/manifest.json`) se restauraron con `git checkout -- .` al final; el árbol quedó limpio.

## C2-3. Alcance y criterio

Se probaron las mismas cinco capas que en C1, más los artefactos de datos y el banco estadístico:

1. Motor determinista y simulador (`services/engine`).
2. Capa LLM, verificador y red-team.
3. API FastAPI, incluido el enlace de misión.
4. Crew tablet (typecheck, build, fisiología, E2E de navegador y smoke de integración).
5. Ground console, validación estadística, fault injection, gobernanza, vault y snapshots de datos.

**Criterio:** una prueba pasa solo si el comando termina con código 0 y todas sus aserciones se cumplen. En fault injection, un FAIL/ERROR es un hallazgo, no una prueba rota.

## C2-4. Comandos ejecutados

```bash
# Motor y calidad
.venv/bin/python scripts/run_tests.py
.venv/bin/python -m pytest -q                       # raíz
cd services/engine && ../../.venv/bin/python -m pytest -q
cd services/engine && ../../.venv/bin/ruff check .
.venv/bin/python -m pytest -q tests/property
.venv/bin/python -m pytest -q ml/proxy/test_adaptive_conformal.py

# Simulación, estadística y datos
.venv/bin/python ml/validation/run_all.py
.venv/bin/python scripts/fetch_noaa.py --offline
sha256sum -c  # verificación de los 5 snapshots contra manifest

# API sin LLM
LLM_PROVIDER=none PYTHONPATH=services/engine .venv/bin/python - <<'PY'
# TestClient: /, /api/health, /api/scenarios, /api/scenario/{name}, /api/card, /api/llm-stats
PY

# Frontend
cd apps/crew-tablet && npm run typecheck
cd apps/crew-tablet && npm run build
cd apps/crew-tablet && npm run test:physiology
cd apps/crew-tablet && npm run test:e2e:browser
cd apps/crew-tablet && PYTHON="$PWD/../../.venv/bin/python" npm run test:e2e
cd apps/ground-console && npm test

# Gobernanza y seguridad
.venv/bin/python scripts/audit_vault.py
.venv/bin/python scripts/check_ownership.py --overlaps
PYTHONPATH=services/engine .venv/bin/python tools/researcher/test_researcher.py
.venv/bin/python tests/fault_injection/run.py
node /tmp/qa-browser.mjs <url>   # FI-26/27 con Chromium y SW bloqueado
```

## C2-5. Resumen de resultados

| # | Componente | Comando / prueba | Resultado | Estado |
|---|---|---|---|---|
| 1 | Motor — runner propio | `scripts/run_tests.py` | **123/123** funciones | PASA |
| 2 | Motor — pytest | `pytest -q` en `services/engine` | **123 passed** (10,95 s) | PASA |
| 3 | Suite raíz — pytest | `pytest -q` en la raíz | **139 passed, 8 subtests** (11,07 s) tras instalar `hypothesis` | PASA (con ajuste) |
| 4 | Lint Python | `ruff check .` | **1 error** `I001` (`tests/test_api.py:2`) | FALLA |
| 5 | Propiedades del verificador | `pytest tests/property` | **2 passed** (1.200 ejemplos c/u) | PASA |
| 6 | Conformal adaptativo | `pytest ml/proxy/test_adaptive_conformal.py` | **3 passed** | PASA |
| 7 | Simulador de escenarios | `tests/test_simulate.py` (en #2) | **5/5** | PASA |
| 8 | Validación estadística | `ml/validation/run_all.py` | termina OK (2m16s) y **regenera 3 artefactos idénticos** (SHA-256) | PASA |
| 9 | Snapshots de datos | SHA-256 contra `manifest.json` | **5/5** snapshots íntegros; `MMASH.zip` ausente | PASA (parcial) |
| 10 | Panel NOAA offline | `fetch_noaa.py --offline` | 286 puntos, S-max S0, label `real-public` | PASA con observación |
| 11 | API — 5 endpoints | TestClient, `LLM_PROVIDER=none` | 200/404 correctos; plantilla con 1 cita; **0 llamadas LLM** | PASA |
| 12 | LLM — verifier y red-team | `tests/test_verifier.py`, `test_llm.py`, `llm.redteam` | **18/18, 14/14, 30/30** | PASA |
| 13 | Tablet — typecheck | `npm run typecheck` | sin errores | PASA |
| 14 | Tablet — build | `npm run build` | OK (2,3 s); chunk de 1.300 kB sobre el umbral | PASA con aviso |
| 15 | Fisiología | `npm run test:physiology` | **8/8** | PASA |
| 16 | E2E navegador | `npm run test:e2e:browser` | **14 passed, 0 failed** | PASA |
| 17 | Smoke de integración | `PYTHON=... npm run test:e2e` | **26/26 grupos** | PASA |
| 18 | Ground console | `npm test` | **8/8** | PASA |
| 19 | Vault Obsidian | `scripts/audit_vault.py` | 49 notas, 227 wiki links, **0 problemas** | PASA |
| 20 | Ownership | `scripts/check_ownership.py --overlaps` | **6 archivos sin dueño** (`docs/ai/*.md`) | FALLA |
| 21 | CLI investigador | `tools/researcher/test_researcher.py` | **8/8** | PASA |
| 22 | Fault injection | `tests/fault_injection/run.py` | **25/26**; FI-26/27 en ERROR por falta de Chrome | PARCIAL |
| 23 | FI-26/27 verificación manual | Chromium + SW bloqueado | **2/2** comportamientos correctos | PASA (producto) |

**Agregado:** 128 verificaciones Python automatizadas pasan, 42 comprobaciones de navegador (14 E2E + 26 smoke + 2 FI) pasan y 8 pruebas de ground console pasan. Quedan 1 defecto de lint, 1 de ownership y 1 script de fault injection desactualizado.

## C2-6. Detalle por componente

### C2-6.1 Motor determinista y simulador

- **Runner propio:** 123/123. Cubre N-of-1, síndrome, QC, pipeline, simulador, lentes/umbrales, crew/ground/clima espacial y verificador.
- **pytest en `services/engine`:** 123 passed, 10,95 s. El número coincide con el runner porque pytest ya descubre los mismos casos (en C1 había una diferencia de 95 vs 88 por subtests, hoy no aparece).
- **pytest en la raíz:** falló primero con `ModuleNotFoundError: hypothesis` durante la colección de `tests/property/test_verifier_properties.py`. Tras instalar `hypothesis 6.170.15`, **139 passed + 8 subtests** en 11,07 s, sin fallos.
- **Propiedades:** 2/2. Rechazo de urgencia rebajada y de números inventados en el titular, 1.200 ejemplos aleatorios por propiedad, deterministas.
- **Simulador:** 5/5. Semilla determinista, etiquetas en sidecar (nunca dentro de las lecturas), misma semilla reproducible en proceso nuevo, y `sep_sleep_loss` con S-scale y dropouts reales.
- **Lint:** `ruff check .` reporta **1 solo error** `I001` en `tests/test_api.py:2` (bloque de imports sin ordenar). En C1 eran 2. Es corregible con `ruff check --fix --select I`.

### C2-6.2 Estadística y datos

- **`ml/validation/run_all.py`:** terminó con código 0 en **2m16s**. Regeneró `docs/validation.md`, `ml/validation/results.json` y `apps/crew-tablet/public/data/validation.json` con **hash SHA-256 idéntico** al commit, lo que confirma que el banco es determinista y que los números publicados corresponden al código actual.
- Cifras vigentes del banco (sintéticas): calibración nominal 95 %, comparación de métodos con presupuesto de falsa alarma igualado, robustez a 0/20/40 % de lecturas faltantes y a 3/7/14 días de historia personal. **No es validación clínica.**
- **Snapshots:** los 5 archivos del manifiesto commit (GOES protones, DONKI SEP/FLR/CME/GST) coinciden byte a byte con su SHA-256. `data/snapshots/MMASH.zip` **no está en el repo** (artefacto descargado, ignorado por git), por lo que `ml/proxy/mmash.py` no se pudo ejecutar; su suite de contrato (`test_adaptive_conformal.py`) sí pasa 3/3.
- **Panel NOAA offline:** genera 286 puntos etiquetados `real-public`, S-max S0, sin red. **Observación:** reescribe `apps/crew-tablet/public/data/radiation.json` y `data/snapshots/manifest.json` con un `retrieved_at` nuevo aunque no haya red; eso cambia el fixture que consumen el smoke y FI-26 (ver C2-7).

### C2-6.3 API y capa LLM

| Endpoint | Resultado |
|---|---|
| `GET /` | 200, `lightminute-api 0.1.0`, `synthetic: true`, `not_a_medical_device: true` |
| `GET /api/health` | 200, `llm_provider: none`, `llm_key_present: false`, `llm_model: deepseek-flash`, 3 escenarios |
| `GET /api/scenarios` | 200, 3 escenarios (`cmo_fever`, `sep_sleep_loss`, `co2_creep`) |
| `GET /api/scenario/cmo_fever?days=24` | 200, 24 días, `source: engine` |
| `GET /api/scenario/nope` | **404** correcto |
| `POST /api/card` | 200, `card_source: template`, nivel `info`, 1 cita (`HRP-RISKS-OVERVIEW`), `usage.calls: 0`, `synthetic: true` |
| `POST /api/card` con crew inexistente | **404** (ver observación OBS-05) |
| `GET /api/llm-stats` | 200, `calls: 0`, `fallbacks: 0`, sin exponer la clave |

Se confirma el invariante central: con `LLM_PROVIDER=none` el producto responde completo desde el motor y la plantilla, sin red y sin llamadas al modelo.

### C2-6.4 Crew tablet

- **typecheck:** `tsc -b` sin errores.
- **build:** 2,3 s; `dist/` generado; aviso no bloqueante por el chunk principal de **1.300 kB** (363 kB gzip).
- **fisiología:** 8/8 (integrador RK4, desplazamiento de fluidos, ICP/SANS, quimiorreflejo, Gauer-Henry, balance térmico, remodelado musculoesquelético y orquestación multiorgánica).
- **E2E navegador:** **14/14** contra `dist/` sin API: Glance, Why, Act, radiación con procedencia, validación, snapshot contradictorio no confiable, escenario faltante rechazado, CO2 sin payload sustituido, estados vacíos honestos, PVT-B de 10 ensayos, check-in persistente, **export PDF del baseline personal**, móvil 390 px y cero errores de página.
- **Smoke de integración:** **26/26 grupos** con API local real y `LLM_PROVIDER=none`: service worker offline, arranque sin bloqueo, voz simulada, Bluetooth mock, firma Ed25519, cadena de auditoría, fuentes NASA/OSDR, anatomía 3D con licencia y fallback sin WebGL, tres lentes, protocol runner, cambio de tripulante, check-in, límite de tendencias, NOAA + DONKI, cohortes y calibración, tres escenarios en días 1/16/24, 10 vistas en 4 anchos, claro/oscuro, ground console, demo `file://`, Earth-link y UI de producción contra API real.

### C2-6.5 Ground console, gobernanza y herramientas

- **Ground console:** 8/8. La cadena de auditoría del navegador coincide con el hash de Python, detecta payload manipulado y enlace roto, y el JSON canónico escapa no-ASCII igual que `ensure_ascii`.
- **Vault:** 49 notas, 227 wiki links, 47 enlaces de archivo, 56 ítems de checklist, **0 problemas**.
- **Ownership:** 6 archivos de `docs/ai/` sin dueño declarado en `agents/OWNERS.json` (`DATASET-CARD.md`, `INVENTORY.md`, `MODEL-CARD.md`, `OPEN-QUESTIONS.md`, `RESUMEN-ES.md`, `SLM-TRAINING-RECORD.md`); el comando sale con código 1. En C1 eran 9 archivos, todos distintos.
- **CLI investigador:** 8/8 (contratos offline, aislamiento por sujeto, sin entrenar con futuro, HTML escapado y determinista).

### C2-6.6 Fault injection

`tests/fault_injection/run.py` ejecutó 26 aserciones: **25 PASS**. Todas las inyecciones del motor y de la API se comportaron de forma segura (FI-01 a FI-25), incluidos los 9 hallazgos abiertos en C1 (FI-02, 07, 10, 11, 13, 15, 20, 23, 25), que hoy **pasan**.

El único caso en ERROR es el par de navegador **FI-26/27**, y el error real es del entorno/harness, no del producto:

1. `browser.mjs` lanza `chromium.launch({ channel: "chrome" })` y este equipo no tiene Google Chrome.
2. Con Chromium de Playwright, el localizador `dt` con texto exacto `Retrieved` ya no coincide: la UI renderiza `RETRIEVED` (mayúsculas), por lo que el caso expira aunque el dato esté presente.
3. El service worker de producción sirve `data/radiation.json` desde caché, así que el `page.route(...)` que inyecta el fixture de 2000 no siempre se aplica.

**Verificación manual equivalente (Chromium, `serviceWorkers: "block"`, API forzada a 503):** la etiqueta `Archived snapshot · not live` aparece, el campo Retrieved muestra `1 Jan 2000 00:00 UTC` con el fixture inyectado, Glance muestra `Local simulation` y conserva la etiqueta `synthetic`. Conclusión: **FI-26 y FI-27 pasan como comportamiento de producto**; el script de fault injection necesita actualización (no se modificó en esta campaña).

## C2-7. Defectos y observaciones de la campaña 2

| ID | Severidad | Área | Descripción | Impacto |
|---|---|---|---|---|
| OBS-01 | Media | CI | `ruff check services/engine` falla con 1 `I001` en `tests/test_api.py:2` (imports sin ordenar). | Bloquea el job de lint. |
| OBS-02 | Media | Gobernanza | `check_ownership.py --overlaps` reporta 6 archivos de `docs/ai/` sin dueño y sale con código 1. | Bloquea el chequeo de ownership. |
| OBS-03 | Media | Reproducibilidad | `hypothesis` está declarada como dependencia `dev` pero no estaba instalada; `pytest` desde la raíz aborta la colección en vez de saltar la suite. | Un checkout con `make setup` incompleto no puede correr la suite completa. |
| OBS-04 | Media | Harness FI | `tests/fault_injection/browser.mjs` exige `channel: "chrome"`, usa un localizador sensible a mayúsculas (`Retrieved`) y compite con el service worker por el fixture. | FI-26/27 queda en ERROR en equipos sin Chrome y ya no verifica lo que dice verificar. |
| OBS-05 | Baja | API | Un `crew` inexistente en `POST /api/card` devuelve **404** (se trata como escenario no encontrado) en vez de 422 de validación. | Semántica HTTP discutible; el error es seguro y no filtra datos. |
| OBS-06 | Baja | Datos | `scripts/fetch_noaa.py --offline` reescribe `public/data/radiation.json` y `manifest.json` con un `retrieved_at` nuevo aunque no haya red. | Cambia fixtures versionados y hace fallar el smoke hasta reconstruir `dist/`; debe evitarse en una campaña de solo lectura. |
| OBS-07 | Baja | Datos | `data/snapshots/MMASH.zip` no está en el repo (ignorado), por lo que el proxy real sobre MMASH no se puede reproducir sin descarga. | El proxy real queda no verificado en esta campaña. |
| OBS-08 | Baja | Rendimiento | Chunk principal de 1.300 kB (363 kB gzip) por encima del umbral de aviso de Vite. | Solo afecta tiempo de carga; no rompe el build. |
| OBS-09 | Info | Entorno | El smoke `test:e2e` requiere `PYTHON` absoluto; sin él busca `python` en `PATH` o la ruta Windows `.venv/Scripts/python.exe`. | Falla por configuración, no por producto. |

No se detectaron regresiones funcionales. Todos los artefactos generados por la campaña se restauraron; el árbol quedó limpio.

## C2-8. Limitaciones

- Entorno **local y offline**: no se probaron despliegues, latencia real, Postgres real, Cloudflare en producción ni Google OAuth contra Google.
- El cliente LLM no se ejercitó contra una clave real de DeepSeek; se validó el contrato, el verificador y el fallback (`none`), no la calidad del modelo.
- Los datos son sintéticos y los proxies públicos. **Ningún resultado es validación clínica ni evidencia de eficacia médica.**
- El fault injection es un conjunto acotado de fallos sintéticos, no una certificación de seguridad.
- Navegador: solo Chromium headless; no cubre Safari, Firefox ni GPU real.
- El proxy MMASH no se ejecutó por falta del snapshot descargado.

## C2-9. Control de versiones del documento

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-11-14 | Campaña C1 | Documento inicial: 18 filas de resultados, 9 hallazgos FI abiertos, 2 bloqueos de CI. |
| 1.1 | 2026-11-15 | Buffy (Freebuff) · DeepSeek V4.1 Flash Slow | Se añade la Campaña 2 completa (C2-1 a C2-10), el registro de campañas y este control de versiones. Se conserva C1 sin editar su contenido. |

| Artefacto de esta campaña | Versión / revisión |
|---|---|
| Código base probado | `3c682ae` (`main`) |
| Documento QA | v1.1 (este archivo) |
| `docs/validation.md` | regenerado, hash idéntico al commit |
| `ml/validation/results.json` | regenerado, hash idéntico al commit |
| `apps/crew-tablet/public/data/validation.json` | regenerado, hash idéntico al commit |
| `docs/safety/fault-injection-results.{json,md}` | regenerado durante la prueba y **restaurado** al commit |
| Capturas E2E y `docs/qa/browser-results.json` | regenerados y **restaurados** al commit |
| `docs/pruebas/pruebas-qa.md` | único archivo nuevo/modificado de la campaña |

## C2-10. Reproducibilidad

```bash
make setup
.venv/bin/pip install "hypothesis>=6,<7"      # solo si no está
.venv/bin/python scripts/run_tests.py
.venv/bin/python -m pytest -q
(cd services/engine && ../../.venv/bin/ruff check .)
.venv/bin/python ml/validation/run_all.py
cd apps/crew-tablet && npm run typecheck && npm run build && npm run test:physiology
cd apps/crew-tablet && npm run test:e2e:browser
cd apps/crew-tablet && PYTHON="$PWD/../../.venv/bin/python" npm run test:e2e
cd apps/ground-console && npm test
cd ../.. && .venv/bin/python scripts/audit_vault.py
.venv/bin/python scripts/check_ownership.py --overlaps
.venv/bin/python tests/fault_injection/run.py
```

**Conclusión C2:** el producto sigue siendo funcional y coherente en todas sus capas, con 123/123 en el motor, 14/14 en E2E de navegador, 26/26 en el smoke de integración, 8/8 en fisiología y ground console, y una validación estadística que se reproduce byte a byte. Frente a C1: se resolvieron los 9 hallazgos de fault injection del motor/API y el lint bajó de 2 a 1 error; siguen abiertos el lint restante, 6 archivos sin dueño y un harness de navegador desactualizado (FI-26/27), que no oculta ningún fallo del producto.
