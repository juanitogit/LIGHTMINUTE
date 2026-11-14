---
tags: [exec]
status: decided
updated: 2026-11-13
---
# Plan 48 h (ajusta al cierre de tu evento local — confírmalo)
## Hoy (vie 13) — preparación (≈2–3 h)
- [ ] Registrarse, elegir evento, confirmar **hora de cierre de entrega** y leer la página oficial del reto + recursos
- [ ] Repo público + LICENSE; `cp .env.example .env`; clave DeepSeek + saldo; `make skills`
- [ ] `dsh web` o Claude Code funcionando contra `deepseek-flash`
- [ ] Descargar snapshots (NOAA GOES, RadLab, OSDR I4, MMASH) con manifest
- [ ] Roles; dormir
## Sábado 14
- 08–10 Simulador (escenario 1) + feature store
- 10–13 Motor N-of-1 integrado + CUSUM + reglas + plantillas
- 14–17 Decision Cards: prompt, KB, verificador, caché
- 17–21 UI tablet Glance→Why→Act
- 21–23 Panel radiación; commit estable (demo corre de punta a punta)
## Domingo 15
- 08–11 Escenarios 2 y 3 + consola de tierra/retraso
- 11–14 `make validate` → docs/validation.md, model card, página de validación
- 14–16 Pulido, accesibilidad, `demo-runbook.md`
- **T-4 h congelar** · **T-3 h video + enviar** · buffer final
Si trabajas solo: recorta SHOULD y COULD ([[Alcance MoSCoW]]). Roles (5): ciencia/motor · simulación+validación · LLM/KB · UI · pitch+docs.

Relacionado: [[00-Home]].

## Verificación posterior de fases (2026-11-14)

| Bloque del plan | Resultado comprobado |
|---|---|
| Simulación y feature store | Implementado; tres escenarios × strong/mild; pruebas Python y exportación. |
| N-of-1, CUSUM, reglas y plantillas | Implementado; 78/78 pruebas y regresión del mensaje rutinario. |
| Decision Cards, KB y verificador | Implementado en plantilla; 30/30 red-team. LLM real pendiente. |
| Tablet Glance → Why → Act | Implementado; build y pruebas de navegador con API y fallback. |
| Panel radiación | Verificado con checksum NOAA y gráfica histórica real-public. |
| Escenarios 2/3 y consola de tierra | Verificados desde la UI, incluidos doble clic y cadena de auditoría. |
| Validación, model/data card | Benchmark regenerado y vista de evidencia revisada. |
| Pulido y runbook | Rediseño LIGHTMINUTE, logo oficial, móvil/temas/presentación, runbook y capturas. |
| Congelación, video y envío | No realizados; requieren datos del equipo, cierre y entrega externa. |

Los ítems preparatorios agrupados arriba siguen abiertos si una parte no se puede verificar.
No se presupone inscripción, saldo, acceso a dsh/Claude, descarga de RadLab/OSDR ni asignación de roles.
Ver [[Auditoria integral LIGHTMINUTE]].
