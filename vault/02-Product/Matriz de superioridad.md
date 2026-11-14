---
tags: [product, competition]
status: draft
updated: 2026-11-13
---
# Matriz de superioridad (según lo visible en sus README)
| Capacidad | Rivales | TETHER | Prueba |
|---|---|---|---|
| Umbrales con fuente etiquetada | CHM sí | sí (el cargador **rechaza** sin etiqueta) | `protocols/thresholds.py` |
| Reglas Tierra vs espacio | CHM sí | + **lente personal** con incertidumbre | `lenses.py` |
| Baseline personal | AURORA sí | bayesiano con intervalos creíbles | `bayes/nof1.py` |
| Incertidumbre visible | no visible | sí | banda 95% + confianza |
| Alerta por señales coordinadas débiles | no visible | **síndrome**: 71% vs 18% recall leve | `docs/validation.md` |
| Tripulación heterogénea | no visible | población cae a 27%, N-of-1 88% | `docs/validation.md` |
| Atribución compartida vs individual | no visible | sí | `crew/attribution.py` |
| Retraso de comunicación | CHM sí | + enrutamiento "a bordo primero" | `ground/delay.py` |
| Auditoría a prueba de manipulación | AURORA (cifrado) | cadena de hashes | `audit.py` |
| LLM | sin LLM / reformulación | LLM explica con verificador + fallback | `llm/verifier.py` |
| Validación comparativa con límites | no visible | sí, honesta | `ml/validation/run_all.py` |
**Dónde aún perdemos:** presentación 3D/pulido visual (CHM), cifrado/offline completo (AURORA). Compensar con relato + demo clara ([[Demo killer - lentes en desacuerdo]]).
