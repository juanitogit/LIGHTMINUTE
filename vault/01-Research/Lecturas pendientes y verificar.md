---
tags: [research, verify]
status: draft
updated: 2026-11-13
---
# ⚠️ Pendiente de verificar (honestidad ante todo)
- [ ] **Página oficial del reto + recursos**: búsqueda indexa https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/; fetch directo devolvió 502 en revisión del coordinador. No se certifica lectura completa.
- [x] Hora recibida del usuario: Space Apps Challenge Neiva 2026, 15-nov-2026 23:59 America/Bogota (UTC−5); no verificada externamente. Ver [[Equipo y evento Neiva 2026]].
- [ ] Texto 2026 de la Judging Guide y T&C (código público, divulgación de IA, elegibilidad)
- [ ] Licencia de DeepSeek-V4.1-Flash (V4-Flash-0731 fue MIT)
- [x] Documentación oficial DeepSeek JSON: `response_format: {type: json_object}` confirmado en https://api-docs.deepseek.com/guides/json_mode/ (revisión web del coordinador, 14-nov). Advierte contenido vacío posible aun con stop; esto no acredita una llamada real.
- [ ] Endpoint/clave de NASA DONKI para eventos SEP
- [ ] Rangos de NASA-STD-3001 Vol.1/2; límite de dosis de carrera (otro repo cita 600 mSv)
- [ ] Límites de CO₂ y SOPs de escalada
- [ ] Qué subconjunto de OSD-569 / Inspiration4 usar

## Documentación de proveedor contrastada (14-nov)
- [x] Thinking mode oficial: https://api-docs.deepseek.com/guides/thinking_mode/ documenta low/high/max y `extra_body` thinking. Fuente: revisión web del coordinador.
- [ ] Ejecución real con clave: sigue sin acreditarse. Confirmar documentación no sustituye smoke de proveedor, modelo o caché.
Ver [[Board]].
