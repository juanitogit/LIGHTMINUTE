---
tags: [product]
status: decided
updated: 2026-11-13
---
# Decision Card spec
Campos: `level` (motor) · `headline` · `what_changed` (solo números del motor) · `why_it_matters` · `confidence` · `do_now` (1–5) · `monitor` · `escalate_if` · `ground_message` (≤140) · `citations` (ids de KB).
Flujo: hechos del motor → LLM (o plantilla) → **verificador** → UI. Rechaza: números inventados, citas falsas, cualquier cambio de urgencia respecto al motor, lenguaje diagnóstico. Código: `tether_engine/llm/verifier.py`; los resultados vigentes se registran en [[Checklist de implementacion 2026-11-14]]. Ver [[ADR-001 Motor decide LLM explica]] y skill `decision-card-contract`.
Escalera de acción: autochequeo → re-medir → compañero → protocolo a bordo → mensaje a tierra → emergencia.

## Contrato tras revisión local
`level` debe ser idéntico al del motor. `what_changed`, `do_now`, `monitor`, `escalate_if` y `ground_message` se copian literalmente de la plantilla determinista. El modelo puede variar `headline` y `why_it_matters` sin números, sujeto a verificación. Los filtros de lenguaje son defensa adicional y no una garantía clínica semántica.
