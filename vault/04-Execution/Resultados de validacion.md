---
tags: [exec, validation]
status: verified
updated: 2026-11-13
---
# Resultados de validación (sintéticos, mismo presupuesto de falsas alarmas ≈0.1/semana)
**Tripulación homogénea:** población 18/38/91% (leve/moderado/fuerte) · N-of-1 z 22/41/85% · CUSUM 18/72/100% · **síndrome 70/96/100%**.
**Heterogénea (sd entre personas ×2.5):** población 9/13/27% · N-of-1 z 26/50/88% · CUSUM 9/40/98% · **síndrome 66/93/100%**.
## Lectura honesta
- El z-score N-of-1 por indicador **no** es mucho mejor que una regla poblacional en tripulación homogénea. No lo afirmes.
- Las ganancias: **CUSUM** (cambios sostenidos), **síndrome** (señales coordinadas) y **heterogeneidad**.
- El síndrome usa una dirección clínica previa (límite declarado). Todo es sintético; no es validación clínica.
Reproducir: `python ml/validation/run_all.py`. Ver [[Matriz de superioridad]].
