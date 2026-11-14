---
tags: [exec, audit, qa, design, obsidian]
status: verified
updated: 2026-11-14
sources: [docs/qa/browser-results.json, docs/qa/vault-audit.json, docs/ui-audit.md, pruebas locales]
---
# Auditoría integral LIGHTMINUTE

**El MVP funciona localmente; la entrega externa todavía tiene pendientes.**
No se han cerrado casillas por existir un archivo: cada fase tiene una prueba o un límite explícito.
El detalle de los 49 ítems originales se conserva en `docs/qa/vault-audit-before.json`;
el inventario actualizado se regenera con `python scripts/audit_vault.py`.

## Fases revisadas

| Fase | Estado y evidencia |
|---|---|
| A1 — motor y simulación | Implementado: 78 pruebas Python; 3 escenarios × strong/mild; exportación regenerada. El diagnóstico de 2.000 actualizaciones pasa; MMASH vuelve a dar 93,4 % de cobertura. |
| A2 — API y explicaciones | Implementado en modo plantilla; API probada desde navegador. 30/30 ataques rechazados. DeepSeek real sigue sin ensayo con clave. |
| A3 — tablet | Cinco vistas verificadas con API y fallback; 375/768/1024/1440 px, temas claro/oscuro y presentación. Logo oficial y nueva navegación. |
| A4 — consola y protocolos | 8/8 vectores de auditoría; protocolo completo de 9 pasos, skip y undo, detección de manipulación, consola y runner abiertos por file://. El envío y consentimiento son simulados. |
| A5 — ciencia y datos | Benchmark regenerado; NOAA verificado por SHA-256 y 2.288 filas; gráfica de 286 puntos reales archivados. Dos cohortes y cuatro métodos visibles en Validación. No es validación clínica. |
| A6 — documentación y entrega | README, data/model cards, pitch y 8 capturas presentes. Faltan video, URL pública y nombres/roles del equipo. |
| A7 — integración | Build, ownership y enlaces de bóveda verificados. CI ampliado con pruebas de navegador y artefactos; los nuevos cambios siguen locales. |

## Hallazgos corregidos

- 42 enlaces de archivos apuntaban a `project/project/…`; ahora resuelven desde esta bóveda.
- El hub y las notas de estado presentaban tablas históricas como situación actual; ahora remiten aquí.
- `test:e2e` apuntaba a un script inexistente; ahora ejecuta pruebas reales sobre el build de producción.
- El envío simulado y el protocolo conservaban estado al cambiar de tripulante/día; ahora se reinician por contexto.
- Las tarjetas rutinarias afirmaban un desplazamiento coordinado en el mensaje a tierra; se corrigió la plantilla, con regresión reproducida antes del arreglo.
- Radiación presentaba la etiqueta sintética del resto de la app: ahora indica `real-public`, archivo histórico, fecha y fuente NOAA.
- El panel de Validación mostraba objetos anidados como tablas genéricas; ahora compara los resultados publicados.
- La revisión de propiedad omitía `vault/` e incluía resultados de compilación; ahora usa el inventario de Git.
- `check_all.sh` podía ocultar un test fallido tras `tail` y devolver éxito al fallar validación; ahora propaga los fallos.

## Pendientes que siguen abiertos

- Repositorio público: GitHub confirma `isPrivate: true`. No se modificó la visibilidad.
- Video de 60 segundos, enlace público, equipo/roles, inscripción y hora de cierre del evento.
- Revisión de reglas de elegibilidad y condiciones de la edición por el equipo.
- Llamada real a DeepSeek con clave y saldo. Su modo JSON sí está documentado por el proveedor.
- OSDR/Inspiration4, RadLab y DONKI no se presentan como fuentes ingeridas.
- Revisión experta de umbrales/protocolos y licencias pendientes; no se afirman rangos clínicos verificados.
- Persistencia multi-sesión, consentimiento firmado, entrega real store-and-forward, voz/visión y PWA instalable siguen fuera del MVP. Fallback estático no equivale a instalación PWA.
- Lint Python: ejecutado finalmente con `uvx ruff`; 25 incidencias resueltas y comprobación aprobada.

## Obsidian

Fuente: [[00-Home]]. Decisión: [[ADR-005 Identidad y fuente de verdad]].
La bóveda abierta en Documents es anterior a la integración y conserva su contenido;
su nota `LIGHTMINUTE.md` abre esta bóveda con el protocolo de Obsidian.
El grafo de esta bóveda se comprueba con `scripts/audit_vault.py`.

Relacionado: [[Board]] · [[Checklist de entrega]] · [[Plan 48h]] · [[Estado real del repo y bloqueos]] · [[2026-11-14]].

## Documento maestro histórico
Las fases F0–F5 del DOCX de AstroVital siguen parciales: incluyen RIDGE/persistencia, 3D, DONKI, store-and-forward real, predicción y aceptación formal, que este MVP no implementa por completo. Sus 72 campos de IDs vacíos y 10 casillas de revisión documental se inventariaron en `docs/qa/master-document-audit.json`. Ver la matriz detallada en `docs/ui-audit.md`; no confundir estas fases con las entregas A1–A7.
