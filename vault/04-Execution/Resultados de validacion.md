---
tags: [exec, validation]
status: verified
updated: 2026-11-14
sources: [project/ml/validation/results.json, project/docs/validation.md]
---
# Resultados de validación

Tabla resumida del artefacto local `ml/validation/results.json`, no de una nueva ejecución. Porcentajes redondeados, efectos leve/moderado/fuerte. Las semillas de ajuste e informe deben mantenerse separadas.

## Tripulación homogénea

| Detector | Recall leve / moderado / fuerte |
|---|---|
| Población | 18/38/91 % |
| N-of-1 z | 20/39/84 % |
| CUSUM | 13/60/100 % |
| Síndrome | 71/96/100 % |
## Tripulación heterogénea

| Detector | Recall leve / moderado / fuerte |
|---|---|
| Población | 9/13/27 % |
| N-of-1 z | 27/51/89 % |
| CUSUM | 8/30/96 % |
| Síndrome | 66/93/100 % |

## Límites
- Todo recall de esta tabla es sintético, no precisión diagnóstica.
- El síndrome conoce una dirección previa; no detecta cualquier patrón.
- MMASH de 22 adultos prueba cobertura, no detección ni tiempos de aviso.
- OSDR/Inspiration4 no se acredita como descargado.
- Reproducir: `python ml/validation/run_all.py`; conservar versión, semillas, parámetros y resultado.
- Consultar [[Board]] y [[Checklist de implementacion 2026-11-14]] para la ejecución más reciente.
