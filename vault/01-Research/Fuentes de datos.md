---
tags: [research]
status: draft
updated: 2026-11-13
---
# Fuentes de datos
| Dato | Fuente | Uso | Estado |
|---|---|---|---|
| Inspiration4 (n=4) | NASA OSDR, GLOpenAPI (Sanders 2024, doi 10.1038/s41526-024-00393-5) | priors + validación real | verificado (existe) |
| OSD-569 hemograma | osdr.nasa.gov | rangos inmunes | citado por otro repo; #verify |
| Radiación DOSTEL/CRaTER/MSL-RAD | visualization.osdr.nasa.gov/radlab | panel radiación, tormenta mayo 2024 | visto en README de AURORA |
| Protones GOES | services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json | contexto en vivo | URL vista; #verify |
| Eventos SEP | NASA DONKI (api.nasa.gov) | línea de tiempo | #verify endpoint |
| MMASH | PhysioNet | validar con señales tipo wearable | usado por ganadores |
Regla: descargar a `data/snapshots/` con manifest+sha256 (skill `space-data-ingest`).
