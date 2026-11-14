---
tags: [exec, status, hub]
status: verified
updated: 2026-11-14
sources: [project source tree, docs/CHECKLIST-IMPLEMENTACION-2026-11-14.md, local review]
---
# Board — estado vigente

Esta nota es el índice de estado actual. [[Estado real del repo y bloqueos]],
[[Ideas a desarrollar (analisis vault)]] y los primeros bloques de [[2026-11-14]]
son historia de construcción; sus pendientes antiguos no sustituyen este índice.
La auditoría inicial se conserva como línea de base en
[[Auditoria integral y checklist 2026-11-14]]. Resultados y pendientes del cierre:
[[Checklist de implementacion 2026-11-14]] (también `project/docs/CHECKLIST-IMPLEMENTACION-2026-11-14.md`).

## Implementado
- [x] Motor N-of-1, QC, síndrome, atribución, pipeline y tres escenarios strong/mild.
- [x] API, servicio de tarjetas, verificador, plantillas y respaldo sin LLM.
- [x] Tablet Glance → Why → Act y páginas Radiation/Validation; no están pendientes de crear desde cero.
- [x] Protocol runner, tres protocolos y consola de Tierra con simulación de retraso/consentimiento.
- [x] Snapshot NOAA, proxy MMASH, model/data cards y benchmark sintético.
- [x] Parche alpha y prueba de regresión presentes.
- [x] LICENSE Apache-2.0, workflow CI, guiones, runbook Windows y chequeo de ownership corregido.

Los checks sobre las modificaciones de esta sesión se acreditan en la checklist
final, con sus límites. No se trasladan automáticamente los conteos de CI/handoffs antiguos.

## Pendientes de entrega y evidencia externa
- [ ] Aprobar el diff local revisado; **solo el propietario ordena el push**.
- [ ] Verificar acceso anónimo y condiciones oficiales/criterios; evento y cierre recibidos del usuario, pendientes de contraste externo.
- [x] Nombres y roles recibidos del usuario; ver [[Equipo y evento Neiva 2026]].
- [ ] Completar video y enlaces finales; registrar envío real.
- [ ] Comprobar CI del commit que finalmente se publique, después de autorización.
- [ ] Revisar clínicamente umbrales/protocolos antes de cualquier uso real.
- [ ] Acreditar llamada real al proveedor antes de anunciar ese modo como probado; plantilla sigue siendo el modo demostrable sin clave.

## Límites y futuro
- Todas las reglas espaciales son null; no existe una lente espacial validada.
- MMASH evalúa cobertura, no detección; OSDR/Inspiration4 no se acredita como descargado.
- Persistencia, envío durable firmado y consentimiento operacional no equivalen a sus previews actuales.
- Voz/visión, 3D y temperatura central 24 h son ideas futuras, no bloqueos del MVP.
- [[ADR-005 TETHER y AstroVital]] fija la relación documental sin cambiar el nombre del producto.

## Mantenimiento de la bóveda
Editar primero la copia versionada `project/vault/`; reflejar después los mismos Markdown en `../tether-vault/` para Obsidian y comparar hashes. Esta sesión hizo copia explícita; no existe sincronización automática acreditada. Los logs conservan resultados de su momento; el cierre de la sesión registra los nuevos.

## Evento confirmado por el usuario
**Evento:** Space Apps Challenge Neiva 2026. **Cierre:** 15 de noviembre de 2026, 23:59, America/Bogota (UTC−5). Datos confirmados por el usuario; no se presentan como verificación externa de las bases.

Plan previo al cierre: congelación el 15 de noviembre a las **19:59** y envío previsto a las **20:59**, en la misma zona horaria. Son hitos planificados, no acciones completadas. El propietario conserva la autorización exclusiva del push.

Ver [[Equipo y evento Neiva 2026]].


## Cierre de correcciones locales
- [x] OpenCode (CLI) y FreeBuff entregaron sus tareas; revisión integrada y nuevas regresiones cerradas.
- [x] 117/117 Python; 39/39 red-team; 576 tarjetas exportadas; build, 12 smoke, 13 E2E y 5 bloques PVT/storage correctos.
- [x] Consola/runner por archivo: 3 bloques correctos; auditoría JS: 8 checks. API real local en modo plantilla para los tres escenarios.
- [x] Videos locales 30/60 segundos y capturas, equipo y horario confirmados; fuentes terrestres HR/sueño citadas y temperatura marcada demo.
- [ ] Publicación, aprobación editorial, bases, CI remota y envío; no se ejecutó push ni commit.
Detalle y límites: [[Checklist de implementacion 2026-11-14]].
