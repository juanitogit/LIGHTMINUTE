---
tags: [research, deepseek]
status: verified
updated: 2026-11-13
sources: [api-docs.deepseek.com/updates, /guides/thinking_mode, /quick_start/pricing, HF model card, arXiv 2609.19969]
---
# DeepSeek V4.1 Flash — guía de máximo rendimiento
**Qué es:** MoE multimodal (backbone 552B), contexto 1M, salida máx 384K; en API se llama **`deepseek-flash`** (versión V4.1-Flash-1017). Arquitectura nueva con KV-cache muy comprimido. Cifras de benchmarks son *de DeepSeek*, no independientes.

## Palancas
1. **Esfuerzo de razonamiento** `low|high|max` (+ thinking on/off). UI: off/low · Decision Cards: high · red-teaming: max.
2. **Cache-stuffing:** prefijo estable (reglas + KB entera) primero → acierto de caché $0.003/M vs $0.15/M fallo (≈50×). Reemplaza el vector DB. [[ADR-003 Cache-stuffing de la KB]]
3. **Fin de semana = tarifa valle:** pico es lun–vie 01–04 y 06–10 UTC; sáb/dom todo barato (mitad de precio).
4. **JSON output + verificador** → [[Decision Card spec]].
5. **Tool calls:** reenviar `reasoning_content` completo o HTTP 400.
6. **Visión nativa:** leer fotos de pantallas/lecturas analógicas, autoevaluación visual.
7. **APIs nuevas (13-nov):** búsqueda web, lectura de URL, archivos, OCR, ASR, TTS, parámetro de seguridad.
8. **Agentes:** DeepSeek Harness `npx @deepseek-ai/dsh web`; skills en `.dsh/skills` o `~/.agents/skills` (solo hijos directos). Claude Code vía endpoint `/anthropic`. Temp 1.0 / top_p 0.95 para agentes.

## Cuidados
- Datos sintéticos únicamente al llamar una API alojada.
- Proveedor intercambiable + producto funcional sin LLM (`LLM_PROVIDER=none`).
- Pendiente: licencia exacta de V4.1 (V4-Flash-0731 era MIT) → [[Lecturas pendientes y verificar]].
