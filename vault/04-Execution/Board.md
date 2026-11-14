---
tags: [exec]
status: verified
updated: 2026-11-14
---
# Board
> Auditoría vigente: [[Auditoria integral LIGHTMINUTE]]. Estado histórico e integración: [[Estado real del repo y bloqueos]]. Log del día: [[2026-11-14]].

## Hecho (verificado sobre `main`)
- [x] **A1** — `pipeline.run_scenario()` + QC + 3 escenarios × strong/mild (6 indicadores) + exports estáticos
- [x] **A2** — API de 5 endpoints, `card_service` con prefijo cacheable, verificador y 30 casos de red-team
- [x] **A3** — tablet Glance → Why → Act sobre los escenarios reales, runner de A4 montado, build verde
- [x] **A4** — protocol runner (ESM + classic), 3 protocolos sin dosis, consola de tierra con retraso y cadena de auditoría
- [x] **A5** — snapshot NOAA real + panel de radiación, proxy MMASH, benchmark ampliado, model card y data card, defecto `alpha` aislado
- [x] **A6** — README de entrega, 5 documentos de pitch, `SUBMISSION.md`, `ATTRIBUTIONS.md`, arquitectura y estructura
- [x] **Entrega** — repo git en GitHub con `main`, vault versionado en `vault/`, `LICENSE` Apache-2.0, CI en `.github/workflows/ci.yml`
- [x] README reescrito: badges de Space Apps/stack/datos, tabla de stack con el porqué y estado works/partial/missing
- [x] **Parche `alpha`** aplicado en `bayes/nof1.py` + test de regresión (`test_interval_stays_honest_after_many_updates`); validación, MMASH, circadiano y todas las cifras publicadas regenerados (77/77 tests)

## Ahora (bloquea la entrega)
- [ ] **Tú** — poner el repo en **público** (Space Apps lo exige; hoy es privado)
- [x] **Capturas** — ocho estados en `docs/screenshots/`, generados durante las pruebas de navegador
- [ ] **Tú/A6** — video de 60 s y roles del equipo
- [x] **A3** — re-verificar los paneles de validación y radiación con los JSON que publicó A5

## Siguiente
- [x] Ensayo del demo sin LLM, API conectada/fallback, consola y runner por HTTP y file://
- [ ] Plan A: llamada real a DeepSeek con clave y saldo
- [x] `agents/OWNERS.json`: registrar `vault/` para que `check_ownership.py --overlaps` quede limpio
- [ ] Evidencia OSDR (bloqueada por 404) y revisión clínica de umbrales y protocolos

## Después
- [x] Página de validación dentro de la app · [ ] Firmado y consentimiento real del envío a tierra · [ ] Persistencia multi-sesión

Relacionado: [[00-Home]].
