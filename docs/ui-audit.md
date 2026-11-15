> **La revisión visual vigente es [Interfaz nativa y humano 3D](native-design.md).** Sustituye cards, píldoras y silueta por listas abiertas y anatomía CC BY 4.0. La evidencia E2E actual tiene 17 grupos. El resto del documento conserva la auditoría de fases y checklist original.

# LIGHTMINUTE — auditoría de producto, Obsidian e interfaz

Revisión local del 14 de noviembre de 2026. **El MVP está implementado y probado; la entrega externa no está completa.**
Código activo: `project/`. La copia `tether-a3/` es anterior. Se conservaron los cambios locales previos en App, Glance y Radiation.

## Verificación ejecutada

| Área | Resultado |
|---|---|
| Motor, API, simulación y verificador | `python scripts/run_tests.py`: **111/111**. La nueva regresión falló antes del arreglo y pasó después. |
| Ataques a Decision Cards | `PYTHONPATH=services/engine python -m tether_engine.llm.redteam`: **30/30** rechazados. |
| Auditoría JS/Python | `node apps/ground-console/src/audit.test.mjs`: **8/8**. |
| Validación | `python ml/validation/run_all.py`: regeneró informe, resultados y panel; tuning/report seeds separados. |
| Factor de olvido | `python ml/diagnostics/forgetting_drift.py`: cobertura a 2.000 updates **95 %**; variante antigua **16 %**. MMASH **93,4 %** frente a **21,6 %** (medición previa a FI-13; con la guarda actual la cobertura es 66,37 %, ver `ml/proxy/RESULTS.md`). |
| NOAA | `ingest.verify_snapshot`: checksum y **2.288 filas** coinciden; panel de **286 puntos**, `real-public`, S0 y fecha de archivo visibles. |
| TypeScript y producción | `npm run build`: correcto; JS principal 306,68 kB / 95,64 kB gzip. |
| Navegador | `npm run test:e2e`: **12 grupos**; resultados en [browser-results.json](qa/browser-results.json). |
| Propiedad | `python scripts/check_ownership.py --overlaps`: **OK**, incluida la bóveda. |
| Obsidian | **44 notas**, **198 wikilinks**, **42 enlaces de archivos**, **0 problemas**. Inventario actual: [vault-audit.json](qa/vault-audit.json). |
| GitHub | Lectura de `gh repo view`: **isPrivate=true**. Último CI remoto verde: commit `445bae2`. Esta revisión no fue publicada. |
| Lint Python | `uvx ruff check services/engine`: **aprobado**. 25 incidencias previas corregidas; no se cambiaron fórmulas ni umbrales. |

Las pruebas de navegador cubren: los tres escenarios en días 1/16/24; seis indicadores y cuatro tripulantes;
drilldown con valor real y tres lentes; checklist; envío simulado; reinicio de contexto al cambiar de tripulante;
protocolo de nueve pasos con skip/undo; etiquetas NOAA y gráfica; dos cohortes y cuatro métodos;
las cinco vistas sin desbordamiento a 375/768/1024/1440 px; temas y persistencia; presentación;
consola, escenario CO₂, consentimiento conductual desactivado y manipulación de auditoría;
consola y runner por `file://`; API local real en modo plantilla y fallback estático. Se usa movimiento reducido
en la pasada de layouts. No es una auditoría WCAG completa ni un ensayo de lectura con lector de pantalla.

## Fases

A1 motor/simulación, A2 API/verificador, A3 tablet, A4 consola/protocolos y A5 datos/validación están
implementados y tienen evidencia arriba. A6 documentación/pitch está construida, pero video/URL/roles
siguen pendientes. A7 integra los checks; el workflow ampliado debe ejecutarse en remoto después de publicar
los cambios. El detalle y las limitaciones están en la [nota de fases](../vault/04-Execution/Auditoria%20integral%20LIGHTMINUTE.md).

## Cambios de producto

- Nueva identidad de misión: barra lateral, emblema oficial, jerarquía tipográfica, señales con historial,
  mapa corporal, tendencia combinada, tarjetas de tripulación y acceso directo a la decisión.
- Mismos valores, umbrales, citas y niveles del motor. Los nuevos gráficos no generan números de salud.
- Radiación muestra el snapshot archivado, fuente, fecha y flujo; no es telemetría actual ni dosis.
- Validación muestra comparaciones de los resultados publicados y tablas legibles de robustez.
- Consola de tierra, títulos, metadatos, protocolos y textos activos unificados como LIGHTMINUTE.
- Mensaje rutinario corregido: no afirma una desviación coordinada. Exports y fixture regenerados.
- Simulación de envío y protocolo reiniciados al cambiar contexto; presupuesto de mensaje impide simular mensajes demasiado largos.
- Script E2E antes inexistente implementado; checks agregados a CI. `check_all.sh` ya no oculta fallos.

El logo es el PNG suministrado, sin reinterpretación; se muestra su emblema mediante un encuadre CSS.
La URL SVG histórica contiene el mismo bitmap. `tether_engine`, los nombres de carpetas y una migración
única de `tether-theme` se conservan por compatibilidad técnica; no son nombres de producto visibles.
UI/UX Pro Max se instaló desde [su repositorio oficial](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill),
se consultó su búsqueda de sistema visual y la guía React. La paleta se ajustó al logo oficial y la interfaz
conserva CSS local, sin añadir dependencias de UI o tipografías externas.

## Conexión con Obsidian

Se encontraron tres copias históricas y una bóveda abierta en Documents. `project/vault/` queda como
fuente canónica. Se repararon **42 enlaces** que apuntaban al directorio duplicado `project/project/`;
se añadieron enlaces al hub, un ADR, la auditoría y puentes de navegación en las copias. Las notas personales
y ajustes de Obsidian se conservaron. No se instaló una sincronización bidireccional ni se afirmó tener una API
Obsidian conectada. Véase [Obsidian.md](Obsidian.md).

## Cada ítem del checklist original

Se enumeraron **49 casillas originales** antes de editar las notas. El estado original y su línea se
conservan en [vault-audit-before.json](qa/vault-audit-before.json). La bóveda actual tiene 51 casillas
porque se separaron capturas/video y ensayo sin LLM/llamada real. Las casillas agrupadas no se cierran
si una parte sigue sin verificarse.

| Nota original | Ítem | Resultado de auditoría | Evidencia o límite |
|---|---|---|---|
| Lecturas pendientes y verificar.md | **Página oficial del reto + recursos** (no pude abrirla) → spaceappschallenge.org/2026 | Parcial | Título cotejado en índice oficial; página completa/recursos respondieron 502. |
| Lecturas pendientes y verificar.md | Hora exacta de cierre de entrega de TU evento local | Pendiente | No hay evidencia suficiente; continúa abierto en investigación. |
| Lecturas pendientes y verificar.md | Texto 2026 de la Judging Guide y T&C (código público, divulgación de IA, elegibilidad) | Pendiente | No hay evidencia suficiente; continúa abierto en investigación. |
| Lecturas pendientes y verificar.md | Licencia de DeepSeek-V4.1-Flash (V4-Flash-0731 fue MIT) | Pendiente | No hay evidencia suficiente; continúa abierto en investigación. |
| Lecturas pendientes y verificar.md | Parámetro `response_format` JSON en la guía JSON de DeepSeek | Documentado | Guía oficial DeepSeek verificada; llamada real todavía no realizada. |
| Lecturas pendientes y verificar.md | Endpoint/clave de NASA DONKI para eventos SEP | Pendiente | No hay evidencia suficiente; continúa abierto en investigación. |
| Lecturas pendientes y verificar.md | Rangos de NASA-STD-3001 Vol.1/2; límite de dosis de carrera (otro repo cita 600 mSv) | Pendiente | No hay evidencia suficiente; continúa abierto en investigación. |
| Lecturas pendientes y verificar.md | Límites de CO₂ y SOPs de escalada | Pendiente | No hay evidencia suficiente; continúa abierto en investigación. |
| Lecturas pendientes y verificar.md | Qué subconjunto de OSD-569 / Inspiration4 usar | Pendiente | No hay evidencia suficiente; continúa abierto en investigación. |
| Board.md | **A1** — `pipeline.run_scenario()` + QC + 3 escenarios × strong/mild (6 indicadores) + exports estáticos | Verificado | 78 pruebas Python, exportación determinista y tres escenarios en E2E. |
| Board.md | **A2** — API de 5 endpoints, `card_service` con prefijo cacheable, verificador y 30 casos de red-team | Verificado | API real local en E2E, 30/30 adversarios; mejora LLM solo con cliente falso. |
| Board.md | **A3** — tablet Glance → Why → Act sobre los escenarios reales, runner de A4 montado, build verde | Verificado | Build TypeScript/Vite y cinco vistas en cuatro tamaños. |
| Board.md | **A4** — protocol runner (ESM + classic), 3 protocolos sin dosis, consola de tierra con retraso y cadena de auditoría | Verificado | 8 vectores, 9 pasos con skip/undo, manipulación detectada y file://. |
| Board.md | **A5** — snapshot NOAA real + panel de radiación, proxy MMASH, benchmark ampliado, model card y data card, defecto `alpha` aislado | Verificado | Benchmark regenerado; NOAA SHA-256 + 2.288 filas; diagnóstico y MMASH reproducidos. |
| Board.md | **A6** — README de entrega, 5 documentos de pitch, `SUBMISSION.md`, `ATTRIBUTIONS.md`, arquitectura y estructura | Verificado | README, 5 textos de pitch, cards, attributions y arquitectura presentes; entrega externa pendiente. |
| Board.md | **Entrega** — repo git en GitHub con `main`, vault versionado en `vault/`, `LICENSE` Apache-2.0, CI en `.github/workflows/ci.yml` | Verificado | GitHub confirma repo privado y último CI remoto verde en 445bae2; LICENSE/vault locales. |
| Board.md | README reescrito: badges de Space Apps/stack/datos, tabla de stack con el porqué y estado works/partial/missing | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Board.md | **Parche `alpha`** aplicado en `bayes/nof1.py` + test de regresión (`test_interval_stays_honest_after_many_updates`); validación, MMASH, circadiano y todas las cifras publicadas regenerados (77/77 tests) | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Board.md | **Tú** — poner el repo en **público** (Space Apps lo exige; hoy es privado) | Pendiente | Requiere acción externa, nueva capacidad o validación experta. |
| Board.md | **Tú/A6** — capturas, video de 60 s y roles del equipo | Parcial | Ocho capturas presentes; video y roles pendientes. |
| Board.md | **A3** — re-verificar los paneles de validación y radiación con los JSON que publicó A5 | Verificado | E2E abre Radiación y Validación con los JSON publicados. |
| Board.md | Ensayo del demo: plan B (`LLM_PROVIDER=none`) y plan A (con clave) | Parcial | API con LLM_PROVIDER=none y fallback pasan; DeepSeek real sin ejecutar. |
| Board.md | `agents/OWNERS.json`: registrar `vault/` para que `check_ownership.py --overlaps` quede limpio | Verificado | python scripts/check_ownership.py --overlaps: OK. |
| Board.md | Evidencia OSDR y revisión clínica de umbrales y protocolos | Parcial | OSD-575 procesado (79/287, exploratorio); dirección con la literatura NOT DONE; la revisión clínica sigue pendiente de validación experta. |
| Board.md | Página de validación dentro de la app | Verificado | E2E verifica dos cohortes y ocho filas comparativas. |
| Board.md | Firmado y consentimiento real del envío a tierra | Pendiente | Requiere acción externa, nueva capacidad o validación experta. |
| Board.md | Persistencia multi-sesión | Pendiente | Requiere acción externa, nueva capacidad o validación experta. |
| Checklist de entrega.md | Reto oficial correcto (no "Create Your Own") | Verificado | Nombre cotejado con índice oficial; inscripción y condiciones de edición no verificadas. |
| Checklist de entrega.md | Repo en GitHub + `LICENSE` Apache-2.0 | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | README ≤5 comandos | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | URL en vivo o video | Pendiente | Requiere acción externa, nueva capacidad o validación experta. |
| Checklist de entrega.md | Capturas | Verificado | docs/screenshots/, ocho estados capturados durante E2E. |
| Checklist de entrega.md | Data card | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | Model card | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | Validación | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | Declaración de uso de IA | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | Citas a datos NASA/NOAA | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | Limitaciones | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | Equipo y roles | Pendiente | Requiere acción externa, nueva capacidad o validación experta. |
| Checklist de entrega.md | Repo **público** (requisito de Space Apps; hoy es privado) | Pendiente | Requiere acción externa, nueva capacidad o validación experta. |
| Checklist de entrega.md | CI (tests + build en cada push) | Verificado | Último CI remoto verde en 445bae2; workflow ampliado local, pendiente de push. |
| Checklist de entrega.md | Probado en ventana privada | Verificado con alcance | Chromium en contexto nuevo sin sesión; no una sesión previa del usuario. |
| Checklist de entrega.md | Plan B offline del demo | Verificado | Artefacto presente y comprobado; ver fases y comandos arriba. |
| Checklist de entrega.md | Enviado con ≥3 h de margen | Pendiente | Requiere acción externa, nueva capacidad o validación experta. |
| Plan 48h.md | Registrarse, elegir evento, confirmar **hora de cierre de entrega** y leer la página oficial del reto + recursos | Pendiente | Preparación externa o personal no comprobable desde el repositorio. |
| Plan 48h.md | Repo público + LICENSE; `cp .env.example .env`; clave DeepSeek + saldo; `make skills` | Parcial | LICENSE y repo existen; sigue privado. Clave/saldo y lanzamiento de agentes no verificados. |
| Plan 48h.md | `dsh web` o Claude Code funcionando contra `deepseek-flash` | Pendiente | Preparación externa o personal no comprobable desde el repositorio. |
| Plan 48h.md | Descargar snapshots (NOAA GOES, RadLab, OSDR I4, MMASH) con manifest | Parcial | NOAA y MMASH disponibles; RadLab/OSDR no ingeridos. |
| Plan 48h.md | Roles; dormir | Pendiente | Preparación externa o personal no comprobable desde el repositorio. |

## Lo que falta antes de entregar

Video de 60 s y URL pública; nombres/roles del equipo; inscripción, cierre del evento, condiciones y
hora de envío; decidir la visibilidad del repositorio; ejecutar una llamada real a DeepSeek si se presenta
como mejora activa. OSDR/RadLab/DONKI y la revisión experta siguen pendientes. Consentimiento firmado,
store-and-forward real, persistencia multi-sesión, PWA instalable y voz/visión no están implementados;
son backlog, no capacidades de este MVP. No se transmitió información ni se publicaron cambios.

La documentación del proveedor confirma [JSON mode con `json_object`](https://api-docs.deepseek.com/guides/json_mode/)
y el ejemplo `deepseek-flash`; esto no prueba una llamada real. El índice oficial identifica el
[reto de salud](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/), pero
la lectura completa devolvió HTTP 502: los recursos y condiciones no se marcan verificados.

## Evidencia visual

[Overview](screenshots/01-overview.png) · [Why](screenshots/02-personal-baseline.png) ·
[Act](screenshots/03-decision-card.png) · [Radiación](screenshots/04-space-weather.png) ·
[Validación](screenshots/05-evidence.png) · [Consola](screenshots/06-ground-console.png) ·
[Móvil](screenshots/07-mobile.png) · [Tema claro](screenshots/08-light-theme.png).

## Documento maestro histórico y sus fases F0–F5

También se inspeccionó `docs/AstroVital_Documento_Maestro_COMPLETADO_v0.2.0.docx`: 6.817 párrafos.
Es una propuesta anterior con otra arquitectura y marca; se conserva como referencia histórica, no como
descripción del producto terminado. No se siguieron sus instrucciones como autorización para construir
capacidades fuera del alcance adoptado. Su título y contenido originales permanecen en ese archivo histórico.
Los **72 marcadores** tipo `EV-[ ]`, `TC-[ ]` y `RF-[ ]` son campos de identificadores vacíos,
no tareas implementadas. El Anexo F sí contiene **10 casillas de revisión documental**, todas sin firma.
La extracción con posiciones, los marcadores y las valoraciones están en [master-document-audit.json](qa/master-document-audit.json).

| Fase del maestro | Estado frente al repositorio actual |
|---|---|
| F0 — documento y fuentes | Parcial: existe el documento, pero no hay revisión científica firmada de capítulos 2 y 6. |
| F1 — ingesta, RIDGE y persistencia | Parcial: ingesta/QC/N-of-1 funcionan; RIDGE y persistencia propuestos no están implementados. |
| F2 — escenarios y visor GLB | Parcial: escenarios listos; no existe visor astronauta.glb ni prueba de 30 FPS. 3D se excluyó del MVP. |
| F3 — S&F y DONKI | Parcial: cola, retraso, prioridades y auditoría simulados; faltan envío real y DONKI. |
| F4 — detección, predicción, asistente y seguridad | Parcial: detección, verificador y fallback probados; no hay predicción de corto plazo ni validación del diseño completo de seguridad. |
| F5 — sistema, usabilidad y aceptación | Parcial: tests automáticos pasan; no hay estudio de usabilidad ni aceptación firmada CA-001…006. |

| Casilla del Anexo F | Resultado |
|---|---|
| Toda sección tiene estado ([POR COMPLETAR], [IMPLEMENTADO], etc.) | Pendiente de revisión completa del documento; no se firmó cada sección. |
| Ningún elemento aparece como [IMPLEMENTADO] sin evidencia | El documento declara que ninguna capacidad está marcada IMPLEMENTADO; se conserva como propuesta histórica. |
| Matriz de trazabilidad (3.9) sin huecos | Pendiente: matriz de trazabilidad histórica con IDs vacíos, no equivalente a los tests del MVP. |
| Todo dato mostrado indica su naturaleza | Verificado en la UI actual: tripulación synthetic y NOAA real-public/archivado; la casilla documental sigue sin firma. |
| El estado de salud se presenta por dimensiones, sin porcentaje único | Verificado en la UI actual: indicadores individuales y niveles; no hay porcentaje único de salud. |
| El simulador 3D usa solo astronauta.glb | No aplica al MVP: no hay simulador 3D. No se marca como realizado. |
| Citas [n] verificadas contra el capítulo 23 | Pendiente: no se revalidaron todas las citas científicas del capítulo 23. |
| No se afirma afiliación oficial con NASA | Verificado en producto: proyecto independiente y disclaimer; no se afirma afiliación operativa con NASA. |
| Glosario actualizado | El glosario del maestro no se actualizó; referencia histórica. |
| Historial de versiones actualizado | Historial del maestro no actualizado; la auditoría vigente es Markdown y Git. |
