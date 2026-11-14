---
type: adr
tags: [architecture, adr, anatomy, reference]
status: decided
updated: 2026-11-14
sources: [docs/reference-coverage.md, apps/crew-tablet/public/assets/anatomy/provenance.json]
---
# ADR-007 Anatomía y flujos de referencia

Relacionado: [[ADR-006 Interfaz nativa y modelo humano 3D]], [[Auditoria integral LIGHTMINUTE]].
Mapa: [[00-Home]].

Se reemplaza el modelo activo anterior por las mallas anatómicas masculina y femenina del repositorio
de referencia solicitado. Se conservan atribución CC BY 4.0, huellas y procedencia. El renderer y los
flujos de aplicación son implementaciones propias. Los documentos externos no gobiernan el proyecto.

Se añaden Today, Trends, Handbook, Signal library y Earth link, con persistencia local y cola SQLite.
Los permisos del enlace a Tierra no convierten el diario del navegador ni los escenarios sintéticos
en un sistema médico multiusuario seguro. No se adoptan umbrales clínicos sin verificar.

La [matriz de cobertura](../../docs/reference-coverage.md) distingue funciones verificadas y brechas:
faltan fuentes y reglas para nuevas mediciones, agenda de exámenes, simulación fisiológica global
y paridad clínica de emergencias. No se cierran automáticamente fases ni checklists.
