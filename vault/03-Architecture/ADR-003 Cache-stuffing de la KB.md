---
tags: [arch, adr]
status: decided
updated: 2026-11-13
---
# ADR-003 — Cache-stuffing de la KB en el prefijo del prompt
**Decisión:** reglas + KB completa al inicio (idéntico byte a byte), datos del caso al final. Sin embeddings/vector DB. **Por qué:** 1M de contexto + caché en disco de DeepSeek (acierto ≈50× más barato). **Riesgo:** KB debe quedar < unos cientos de miles de tokens; no meter timestamps en el prefijo. Ver [[DeepSeek V4.1 Flash - guia]].
