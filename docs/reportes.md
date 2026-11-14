# Reporte de estado y checklist de LIGHTMINUTE

**Fecha del corte:** 2026-11-14
**Alcance:** pruebas locales después de instalar dependencias en `.venv`.
**Cambios de producto:** ninguno. El único cambio persistente es este reporte. No se hizo commit ni push.

## Resumen ejecutivo

La tablet compila, pasan la consola, 67 pruebas del motor fuera de API, las 30 pruebas adversariales del verifier, la validación estadística y un smoke real de la API con `LLM_PROVIDER=none`. Quedan dos problemas claros: `make lint` reporta 24 hallazgos y el smoke e2e apunta a un archivo inexistente. Las pruebas API incluidas en el runner se cuelgan en `TestClient` con las versiones instaladas; no se consideran aprobadas. Los cuatro endpoints principales sí respondieron 200 en el smoke contra Uvicorn.

| Área | Estado | Evidencia de este corte |
|---|---|---|
| Instalación | ✅ | `PATH="$PWD/.venv/bin:$PATH" make setup`: instalación editable Python/dev completada y `npm ci` completado; npm reportó 0 vulnerabilidades. No se instaló en Python global. |
| Motor, sin API | ✅ | `pytest -q services/engine/tests --ignore=services/engine/tests/test_api.py`: **67 passed** en 9.21 s. |
| Pruebas API vía `TestClient` | ⚠️ Inconclusas | Suite descubre 77 pruebas, pero se bloquea en el primer GET `/api/health`. Un caso aislado también se queda esperando en `starlette.testclient` → `httpx2`; no termina ni falla dentro del tiempo de observación. |
| API contra Uvicorn | ✅ | Con `LLM_PROVIDER=none`: `/api/health`, `/api/scenarios`, `/api/scenario/cmo_fever` y `POST /api/card` respondieron **200**. La tarjeta fue `template`, con `provider=none`, cero llamadas LLM y `verifier_errors=[]`. Escenario de 238 126 bytes. |
| Red team del verifier | ✅ | `python -m tether_engine.llm.redteam`: **30/30** tarjetas adversariales rechazadas. |
| Lint Python | ❌ | `make lint` / Ruff encuentra **24 errores** en engine y tests; 17 son marcados como autocorregibles, pero no se aplicaron cambios. |
| Build tablet | ✅ | `npm run build --prefix apps/crew-tablet`: TypeScript y Vite correctos; 60 módulos, bundle JS 293.81 kB (91.85 kB gzip). |
| Auditoría consola | ✅ | `npm test --prefix apps/ground-console`: **8 comprobaciones aprobadas**, incluidos hashes Python/JS y detección de alteraciones. |
| Smoke e2e tablet | ❌ | `npm run test:e2e --prefix apps/crew-tablet` falla con `MODULE_NOT_FOUND`: falta `apps/crew-tablet/scripts/smoke.mjs`. |
| Validación estadística | ✅ | `make validate` completó con código 0. Regeneró `docs/validation.md`, `ml/validation/results.json` y `apps/crew-tablet/public/data/validation.json`; no hubo diff en esos artefactos. Métricas sintéticas abajo. |
| Sintaxis JS/Python | ✅ | `node --check` en módulos de consola y runner, y `python3 -m compileall -q` sobre engine/scripts/ML finalizaron con código 0. |

## Checklist de lo que hay

### Aplicación y servicios

- [x] Tablet React/TypeScript con flujo Glance → Why → Act, pantallas de radiación y validación, gráficos, componentes de tripulación y runner de protocolo.
- [x] Consola de tierra estática con cadena de auditoría y suite Node.
- [x] API FastAPI y motor Python: endpoints principales comprobados vía Uvicorn; suite `TestClient` bloqueada por el cliente de pruebas instalado.
- [x] Runner de protocolos en `packages/protocol-runner` y protocolos en `kb/protocols/`.
- [ ] Smoke e2e automatizado: falta el script `apps/crew-tablet/scripts/smoke.mjs` declarado en `package.json`.

### Motor, escenarios y datos

- [x] Código del motor Bayesian N-of-1, CUSUM, síndrome, QC, lentes, atribución de tripulación, demoras, ingestión, verifier y capa LLM.
- [x] 67 pruebas no API pasan; los casos incluidos cubren módulos de motor, LLM/verifier, simulación, QC, pipeline y lentes.
- [x] Tres escenarios listados: `cmo_fever`, `sep_sleep_loss`, `co2_creep`; archivos fuerte/suave marcados como `synthetic`.
- [x] Índice publica cuatro miembros de tripulación y seis indicadores: `rest_hr`, `temp_c`, `sleep_h`, `pvt_ms`, `co2_ppm`, `headache_score`.
- [x] Snapshot NOAA GOES y manifest presentes; el manifest indica `mode: real`, fecha 2026-11-14 y checksum.
- [x] MMASH referenciado como proxy público de voluntarios, no datos de astronautas.
- [ ] Verificador de checksum/conteo de los snapshots: no ejecutado en este corte.
- [ ] Exportador comparado contra datos recién generados: no ejecutado; los escenarios estáticos se sirvieron correctamente por API.

### Validación estadística de este corte

La corrida es enteramente sintética. Los resultados publicados señalan calibración agrupada de 95% en 11 040 indicador-días. Para el síndrome direccional, el recall moderado fue 96% en tripulación homogénea y 93% en heterogénea; con 40% de lecturas faltantes, bajó a 76%. El informe advierte que el método conoce la dirección del síndrome, usa ruido gaussiano e indicadores independientes, y que los datos faltantes se simulan aleatoriamente. **No es validación clínica ni evidencia de rendimiento con tripulación real.**

### Evidencia, seguridad y documentación

- [x] KB y documentos de arquitectura, contrato de datos, data card, model card y validación presentes.
- [x] Con `LLM_PROVIDER=none`, API sirvió tarjeta de plantilla, cero llamadas al proveedor y sin errores del verifier.
- [x] Red team rechazó 30/30 tarjetas manipuladas.
- [ ] Camino de llamada real a DeepSeek no probado; requiere credenciales y no fue parte de este corte.
- [ ] Revisión visual/interacción en navegador de tablet, consola y demo `file://` no ejecutada.

## Hallazgos de lint

Ruff reportó **24 problemas** en código y tests: imports sin ordenar, context managers, `dict()` innecesario, captura genérica de `Exception`, alias `re.I` y orden de `__all__`, entre otros. 17 se señalan como autocorregibles. No se ejecutó `ruff --fix`; quedan como trabajo posterior.

## Detalle del bloqueo de las pruebas API

La suite totaliza 77 casos, pero el runner del proyecto queda sin salida en el primer test API. `pytest -vv` identifica el caso `test_health_reports_provider_without_leaking_the_key`; un smoke aislado del mismo GET deja el hilo principal esperando en `starlette.testclient` y su transporte `httpx2`. Las versiones instaladas durante este setup son FastAPI 0.163.0, Starlette 1.10.0, HTTPX 0.28.1 y HTTPX2 2.16.0. Esto señala un bloqueo del cliente de pruebas/entorno, no demuestra un defecto del endpoint. El smoke separado arrancó Uvicorn con `LLM_PROVIDER=none`, consultó los cuatro endpoints y recibió 200 en todos; el servidor se cerró al terminar.

## Pendientes para corregir o confirmar

- [ ] Resolver el bloqueo del `TestClient` (compatibilidad de dependencias o cliente de pruebas) y conseguir que pasen los 77 casos; no considerar los 67 restantes como sustituto de la suite completa.
- [ ] Añadir/corregir `apps/crew-tablet/scripts/smoke.mjs` y ejecutar e2e real en navegador.
- [ ] Revisar los 24 hallazgos Ruff y volver a correr `make lint`.
- [ ] Añadir una ejecución reproducible del smoke API a la verificación automatizada.
- [ ] Verificar snapshot NOAA (hash y conteo) y procedencia del proxy MMASH con las herramientas de ingestión.
- [ ] Hacer revisión visual de tablet, consola, modo API ausente y demo `file://` antes de presentar.

## Conclusión

Hay evidencia funcional sólida del motor fuera de API, del fallback sin LLM, de la build de tablet, la consola y la validación sintética. El API también respondió correctamente en el smoke manual. El proyecto **no queda totalmente aprobado**: suite API automatizada inconclusa por bloqueo de `TestClient`, 24 hallazgos de lint y e2e roto por un archivo ausente. No se modificó código de producto.
