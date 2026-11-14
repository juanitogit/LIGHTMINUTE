---
tags: [architecture, adr, identity]
status: decided
updated: 2026-11-14
sources: [project/README.md, project/docs/AstroVital_Documento_Maestro_COMPLETADO_v0.2.0.docx, local repository review]
---
# ADR-005 — TETHER y AstroVital

**Contexto:** el repositorio implementa TETHER y contiene un documento maestro
AstroVital v0.2.0 que declara propuestas sin acreditar implementación. Sus nombres
y alcances no deben mezclarse en el pitch o en el backlog vigente.

**Decisión documental:** conservar TETHER como identidad del código actual y
tratar AstroVital como referencia de una visión más amplia. Esta clasificación
no cambia nombre ni marca, ni aprueba automáticamente sus propuestas.

| Elemento de AstroVital | Relación con TETHER |
|---|---|
| Riesgos RIDGE y ciclo DEPAP | Marco de referencia; no prueba de que cada riesgo esté modelado o validado |
| Monitoreo, simulación y apoyo a decisiones | Coincide parcialmente con escenarios y motor personales de TETHER |
| Simulador 3D y modelo astronauta.glb | Propuesta futura; no afirmar que existe en la tablet |
| Persistencia y comunicaciones durables | Futuro; cola/consentimiento actuales son previews |
| Requisitos de ingeniería del documento | Candidatos a revisión, no compromiso de alcance por defecto |

**Consecuencias:** los cambios futuros se priorizan contra [[Alcance MoSCoW]] y
se acreditan con código/pruebas. Las referencias NASA motivan el problema y no
constituyen aval ni validación clínica del sistema. Ver [[Board]].
