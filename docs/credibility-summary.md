# LIGHTMINUTE · checklist de revisión y evidencia

**Estado local.** Se revisaron los commits de FreeBuff y la actualización remota `046cd2f`. El panel de órganos mostraba mediciones sintéticas como reales y fabricaba una curva de siete días a partir de un dato. Se retiró la curva, se corrigieron las etiquetas, se agregó la suite fisiológica a CI y se recuperó la indicación explícita de archivo histórico en NOAA.

| Entrega | Estado | Evidencia y límites |
|---|---|---|
| CI de GitHub | Corrección local verificada | Los commits de las capturas fallaron en lint. `8d4ef87` pasó. En `046cd2f` falló la comprobación de responsables. Se asignó el documento fisiológico y `python scripts/check_ownership.py --overlaps` devuelve `ownership map OK`. [Ejecución remota anterior a la corrección](https://github.com/juanitogit/LIGHTMINUTE-NASASPACEAPPS2026/actions/runs/43654806058) |
| Seguridad del software | DONE, 27/27 casos | Los nueve hallazgos se corrigieron y sus casos se conservan como pruebas de aceptación: consentimiento antes de almacenar, deduplicación por `Idempotency-Key`, verificación numérica de cada campo mostrado, frescura de la FC, canal congelado, identidad del respaldo estático, contexto de misión por escenario y cambio sostenido no absorbido por la línea base. [Evidencia y límites](safety/fault-injection-results.md) · [Análisis de peligros](safety/hazard-analysis.md) · [Condiciones de cierre](../handoff/credibility.md) |
| Datos públicos | PARTIAL | Análisis numéricos completados en ambos conjuntos. La ejecución final tras la interrupción excedió la ventana original. La concordancia direccional con la literatura queda sin verificar. [Resultados, figura y reproducción](../ml/proxy/RESULTS.md) |
| Herramienta de investigación | DONE | Instalación offline y comando de ejemplo verificados. Siete pruebas de contrato pasaron. [Guía](../tools/researcher/README.md) · [Verificación](../tools/researcher/RESULTS.md) |
| Autonomía | DONE | De 360 eventos sintéticos, 271 alcanzaron acción. Hubo 71 días de falsa acción por 12.120 días-persona fuera de evento. Ningún evento demostró ventaja temporal bajo la regla conservadora de resolución diaria. [Comparador y sensibilidad](autonomy/RESULTS.md) |
| Temperatura central adicional | NOT DONE | La tarea opcional requería completar y verificar las cuatro anteriores. |
| Regresión de producto | DONE local | 111/111 pruebas del motor, 30/30 tarjetas adversariales rechazadas, 8/8 grupos fisiológicos, 12/12 de OAuth y 17 grupos de navegador pasaron. [Motor](safety/baseline-tests.log) · [Navegador](qa/browser-results.json) |

**Límites para la entrega.** Quedan sin verificar la precisión clínica, la transferencia de MMASH a astronautas, la causalidad de cambios posvuelo, la respuesta de hardware y enlaces reales, la protección frente a cualquier texto generado, la integridad del historial frente a una reescritura completa y el resultado remoto de los commits locales. La gobernanza de la línea base cambia el comportamiento del motor, por lo que las cifras preinscritas de autonomía y de datos públicos son anteriores a esta revisión y requieren una ejecución nueva antes de citarse. Los datos de química de vuelo proceden de cuatro personas. El estudio de autonomía usa el simulador del propio proyecto.

## Cinco líneas para NASA Data / Validation

1. MMASH public terrestrial RR recordings supplied 23,488 held-out minute-level heart-rate observations from 22 participants.
2. The personal baseline covered 93.15% of observations; clock adjustment reached 95.03% with wider predictive bands.
3. In NASA OSD-575, 79 of 287 postflight serum chemistry observations fell outside personal preflight bands in an exploratory four-person analysis.
4. The synthetic scenario engine reached action in 271 of 360 affected crew-events, with 0.041 false action-days per unaffected crew-week.
5. Daily sampling established no conservative lead over the earliest simulated ground reply; clinical benefit remains unverified.
