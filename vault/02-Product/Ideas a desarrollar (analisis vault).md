---
tags: [product, backlog]
status: draft
updated: 2026-11-14
---
# Ideas a desarrollar (análisis del vault)

> Derivado de leer la bóveda completa + estado real del repo (2026-11-14).
> Regla: toda idea respeta [[ADR-001 Motor decide LLM explica]], datos sintéticos etiquetados y citas de KB. Nada de diagnóstico.

## Estado anterior a la integración (histórico)
- Motor: `bayes/nof1.py`, `syndrome.py`, `lenses.py`, `crew/attribution.py`, `ground/delay.py`, `audit.py`, `llm/verifier.py` + tests. ✔
- KB y protocolos: `kb/evidence.yaml`, `thresholds.json`, `syndromes.json`, 3 protocolos. ✔
- UI tablet: solo `prototype/three-lens.html` + `public/demo-data.json`. **Falta la PWA Glance→Why→Act.**
- Simulador: `simulate/mini.py` + `scenarios.py`; faltan escenarios CMO/CO₂ completos y `labels.json`.
- Consola de tierra: estática. Validación: `ml/validation/results.json` + `docs/validation.md`. ✔

Actualización 2026-11-14: simulador, tablet, API, runner y paneles ya existen. Estado vigente: [[Auditoria integral LIGHTMINUTE]]. El listado conserva las ideas y su motivación; no describe bloqueos actuales.

## P0 — implementado; ver auditoría para la evidencia
1. **Simulador de 4 tripulantes completo**: `sep_sleep_loss`, `co2_creep`, `cmo_fever` (+ variantes leve), `labels.json` separado que el motor nunca lee. Alimenta todo lo demás.
2. **Protocol Runner integrado**: los 3 protocolos de `kb/protocols/` ejecutables, cronometrados y auditados; escalera autochequeo→re-medir→compañero→protocolo→tierra→emergencia.
3. **Tablet Glance→Why→Act**: tira de tripulación, Why con 3 lentes y banda 95%, Act con checklist. Es la entrega visible del reto.
4. **Decision Cards de punta a punta** con `LLM_PROVIDER=none` como camino por defecto y LLM+verificador como mejora.
5. **Panel radiación/clima espacial** con snapshot GOES etiquetado `real-public`.

## P1 — diferenciadores con más retorno en jueceo
6. **`cmo_fever` como "aha"**: el médico es el paciente → otro tripulante ejecuta el protocolo + traspaso de rol.
7. **Lentes en desacuerdo + contrafactual**: toggle "¿qué habría dicho una regla fija?" junto al z personal y el síndrome. Hace visible el argumento sin explicarlo.
8. **Síndrome antes que indicador**: gráfico que cruza 4.30 mientras ningún indicador solo lo hace (la evidencia real de validación: 71/96/100 vs 18/38/91).
9. **Atribución a nivel tripulación**: mismo patrón en 2+ personas → causa ambiental compartida (CO₂) vs individual (infección) → acciones distintas.
10. **Retraso con consentimiento por niveles**: cola store-and-forward, cuenta regresiva, mensaje ≤140 autosuficiente; texto conductual no sale del dispositivo por defecto.
11. **Auditoría visible**: cadena de hashes con badge "audit ok" en la consola de tierra.
12. **"No lo sé" honesto**: datos insuficientes → pedir re-medición, no alertar. Es una pantalla, no un mensaje de error.

## P2 — SHOULD/COULD del alcance
13. **PVT-B** en tablet (vigilancia objetiva; enlaza sueño/CO₂/conductual).
14. **Entrada por visión/voz** (DeepSeek): foto de lectura analógica / check-in manos libres con guantes.
15. **Módulo temperatura central 24 h** (RFI NASA): ritmo circadiano + delta post-ejercicio. Umbrales `#verify` antes de afirmar nada.
16. **Silueta SVG** con regiones resaltadas en vez de cuerpo 3D.
17. **PWA offline + estados por URL** para capturas y video reproducibles.
18. **Carta a la Tierra** como pieza emocional del pitch (mensaje autosuficiente + cuenta regresiva).

## No construir
Diagnóstico real · datos personales reales · auth/login · app nativa · hardware · cuerpo 3D pesado · vector DB · carrera de cifrado contra AURORA.

## Límites honestos a respetar al construir
- z N-of-1 por indicador ≈ regla poblacional en tripulación homogénea: **no afirmar lo contrario** ([[Resultados de validacion]]).
- El síndrome usa dirección clínica previa: límite declarado.
- Todo sintético; no es validación clínica.
- Umbrales sin fuente NASA-STD-3001 / CO₂ / DONKI / licencia DeepSeek siguen en [[Lecturas pendientes y verificar]] → marcar `unverified`.

Ver [[Alcance MoSCoW]] · [[Demo killer - lentes en desacuerdo]] · [[Matriz de superioridad]] · [[Plan 48h]].

Relacionado: [[00-Home]].
