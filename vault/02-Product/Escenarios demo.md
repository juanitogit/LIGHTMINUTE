---
tags: [product]
status: decided
updated: 2026-11-13
---
# Escenarios demo (en este orden)
1. **`sep_sleep_loss`** — evento de partículas solares (forma real de GOES) + sueño perdido → FC↑, PVT lapsos↑ en un tripulante. *Muestra contexto de peligro.*
2. **`co2_creep`** — CO₂ sube lento → cefalea, PVT lento, autotest visual deriva. *Muestra acoplamiento ambiente→cuerpo (gancho SANS).*
3. **`cmo_fever`** — el **médico de a bordo** hace patrón febril → cualquier tripulante ejecuta el protocolo; mensaje a tierra tolerante al retraso. *El "aha" del pitch.*
4. (extra) `post_eva_cv`.
Cada uno con variante **leve** y `labels.json` separado (el motor nunca lo lee). Ver skill `synthetic-crew-simulator` y [[Mapa indicador-riesgo]].
