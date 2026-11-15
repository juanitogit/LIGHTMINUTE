# LIGHTMINUTE: estado y auditoría

Revisión: 14 de noviembre de 2026, hora de Bogotá. Estado del repositorio inspeccionado:
`bff842e` más el informe local `4315782`. La revisión separa pruebas ejecutadas, resultados
anteriores y funciones que no se han verificado en producción.

## Resultado principal

El MVP sintético funciona en modo local y el sitio web está publicado, pero **la regresión de
calibración del motor sigue abierta**. El modelo propio se encuentra en un directorio separado
`tether-kit/slm`; no está integrado en el producto. No se debe presentar este sistema como
clínicamente validado ni el modelo local como un proveedor operativo.

## Qué funciona y qué falta

| Área | Estado y evidencia | Límite o pendiente |
|---|---|---|
| Motor determinista y API local | `python scripts/run_tests.py`: **111/111** pruebas pasan; salida local en `%TEMP%/lightminute-current-tests.log`. | Pruebas automatizadas no corrigen la calibración ni equivalen a validación clínica. |
| Calibración | `ml/proxy/RESULTS.md` documenta **66,37 %** de cobertura MMASH para una banda nominal del 95 %, fuera del criterio preinscrito de 90–98 %. | **NO CORREGIDO**. La protección que congela el baseline ante cambios persistentes puede activarse por variación sana. Cambiarla exige pruebas primero, separar desarrollo y evaluación, y medir tanto falsas alarmas como señales sostenidas. No se han ajustado parámetros sobre el resultado conocido. |
| Preregistro | Se documentó que v2 de MMASH y autonomía entró en el mismo commit que los resultados; v1 ya era conocido. | **No puede repararse retroactivamente**. Un futuro estudio necesita un preregistro comprometido antes de observar un conjunto de evaluación independiente. Ver `docs/safety/revision-evidencia-2026-11-14.md`. |
| Seguridad | Última repetición `python tests/fault_injection/run.py`: 27/27 aserciones sintéticas. | Evidencia acotada; no certifica seguridad clínica, comunicaciones reales ni inmunidad general ante ataques. |
| Investigador | `python tools/researcher/test_researcher.py`: siete pruebas de contrato pasan. | Herramienta offline de investigación, no un dispositivo médico. |
| Web y 3D | Sitio `https://lightminute.pages.dev` accesible; modelo anatómico y tablet en el build. | La ejecución de navegador y el build prueban el producto bajo escenarios de prueba; no prueba validación clínica. |
| Backend público | `Invoke-WebRequest https://lightminute.pages.dev/api/health` devuelve HTTP 200 con `Content-Type: text/html`: es HTML, no el JSON de salud de la API. | El código 200 no demuestra que el backend Python esté disponible. Earth link y funciones que precisan API no están verificadas como funcionales públicamente. |
| Cloudflare y Git | `npx wrangler pages project list --json`: `lightminute` indica Git Provider `Yes`; `pages deployment list` registra producción desde `main` en `bff842e`. | El resultado de cada despliegue posterior debe verificarse con Cloudflare, no asumirse. |
| CI y Obsidian | GitHub Actions `43673513922` pasó motor y navegador. Auditoría local: 47 notas y cero problemas de enlaces; ownership corregido. | Las cifras son una instantánea, no una garantía de futuras ejecuciones. |
| LLM conectado | El código del producto contiene cliente DeepSeek configurable, verificador y fallback determinista. Modo `LLM_PROVIDER=none` probado en CI. | La clave `DEEPSEEK_API_KEY` no estaba presente en el proceso de auditoría. No se realizó una llamada real ni se comprobó el modelo remoto en esta sesión. |
| LLM propio | En el directorio hermano `slm` hay entrenamiento LoRA para `Qwen/Qwen2.5-0.5B-Instruct` y adaptadores de prueba. El manifiesto local `smoke_ram4/run.json` registra 527 filas de entrenamiento, 141 de validación y 10 pasos. | `MODEL_CARD.md` indica evaluación pendiente y el wrapper `integration/local_slm.py` es de referencia, no está conectado al servicio del producto. El adaptador `out/adapters/qwen05` que espera ese wrapper no existe. No hay `results.json` ni `EVAL.md` en la raíz SLM. No se hizo inferencia real en esta revisión. |
| Verificador del SLM | El SLM conserva una copia con SHA-256 `69c2922a759e96f19de17e5e78531262bb5d16a85599727f10d30c7505d033aa`. | El verificador actual del producto tiene SHA-256 `91c07a2d48dc5a160aaa71e6a382737223fc6d998c6bae84008ddc435ce3c048`: son distintos. No se puede asumir que el filtro antiguo aplique las mismas garantías. |
| Datos reales y autonomía | Estudios anteriores están en `ml/proxy/RESULTS.md` y `docs/autonomy/RESULTS.md`; el estudio de autonomía es sintético y no ciego. | No se repitieron durante esta auditoría; concordancia direccional Inspiration4 y beneficio clínico permanecen sin demostrar. |

## Próximos pasos verificables

1. Diseñar un cambio del manejo de baseline congelado con pruebas de regresión para deriva sana
   y cambio persistente; registrar criterios y conjunto independiente antes de medirlo. No usar
   los resultados MMASH ya observados como conjunto ciego.
2. Localizar el adaptador SLM definitivo, validar su ruta, alinear el verificador con el producto
   y medir inferencia, rechazo, latencia y fallback antes de conectarlo.
3. Configurar y probar el backend público por separado; comprobar `/api/health` como JSON y no
   como fallback HTML antes de afirmar que Earth link o el LLM funcionan en la web publicada.
4. Mantener como pendientes la evaluación independiente, la revisión experta y la aceptación formal.

Fuentes locales adicionales: `docs/credibility-summary.md`, `docs/reference-coverage.md`,
`slm/MODEL_CARD.md` e `slm/integration/README.md` (estos dos últimos están fuera del repo `project`).
