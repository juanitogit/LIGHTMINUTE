---
tags: [arch, adr]
status: decided
updated: 2026-11-13
---
# ADR-001 — El motor decide, el LLM explica
**Contexto:** un LLM puede alucinar números, bajar urgencia o diagnosticar. **Decisión:** el motor determinista fija números y nivel; el LLM redacta; un verificador rechaza violaciones y cae a plantilla. **Consecuencias:** funciona sin LLM; validez defendible; el "LLM-opcional" responde la pregunta de proveedor/conectividad. Ver [[Decision Card spec]], [[Seguridad y etica]].
