---
tags: [product]
status: decided
updated: 2026-11-13
---
# Decision Card spec
Campos: `level` (motor) · `headline` · `what_changed` (solo números del motor) · `why_it_matters` · `confidence` · `do_now` (1–5) · `monitor` · `escalate_if` · `ground_message` (≤140) · `citations` (ids de KB).
Flujo: hechos del motor → LLM (o plantilla) → **verificador** → UI. Rechaza: números inventados, citas falsas, urgencia rebajada, lenguaje diagnóstico. Código: `tether_engine/llm/verifier.py` (4 tests pasan). Ver [[ADR-001 Motor decide LLM explica]] y skill `decision-card-contract`.
Escalera de acción: autochequeo → re-medir → compañero → protocolo a bordo → mensaje a tierra → emergencia.

Relacionado: [[00-Home]].
