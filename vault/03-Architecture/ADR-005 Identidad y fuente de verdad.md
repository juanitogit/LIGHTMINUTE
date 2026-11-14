---
tags: [architecture, adr, design, obsidian]
status: decided
updated: 2026-11-14
sources: [petición del propietario y logo adjunto, revisión local del repositorio]
---
# ADR-005 — Identidad LIGHTMINUTE y fuente de verdad

## Decisión
La marca del producto es **LIGHTMINUTE**. El PNG entregado por el propietario es el logo oficial;
se conserva byte por byte en `apps/crew-tablet/public/assets/lightminute-official.png`.
El encuadre circular en CSS muestra el emblema sin redibujar el arte.

La tablet conserva React 19, TypeScript y CSS local. La dirección visual es un instrumento de
misión: fondo azul profundo, texto marfil, cian para selección y magenta reservado a la identidad.
Los colores de urgencia conservan su semántica. Los gráficos muestran exclusivamente los datos
publicados por el motor; un gráfico de flujo solar no representa dosis absorbida.

`project/vault/` es la bóveda canónica y versionada. `../tether-vault/`, `../tether-a3/vault/`
y las notas antiguas en Documents son copias históricas. La bóveda abierta en Obsidian recibe
una nota puente con un enlace `obsidian://open` a esta bóveda; no se sobrescriben sus notas personales.
Las copias históricas no se sincronizan automáticamente y no deben usarse para nuevos cambios.

## Compatibilidad y límites
El paquete Python `tether_engine` y los nombres históricos de carpetas se conservan como
identificadores técnicos para no romper importaciones y rutas existentes. La preferencia
`tether-theme` se migra una sola vez a `lightminute-theme`.

No se publica el repositorio, no se transmite información a terceros y no se da por realizada
una llamada real a DeepSeek. Las casillas externas y de revisión experta siguen pendientes.

## Verificación
`python scripts/audit_vault.py`, `python scripts/check_ownership.py --overlaps`,
`python scripts/run_tests.py`, build de tablet y `npm run test:e2e`.

Relacionado: [[00-Home]] · [[Auditoria integral LIGHTMINUTE]] · [[ADR-001 Motor decide LLM explica]].
