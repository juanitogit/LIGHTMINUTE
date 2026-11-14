---
tags: [arch, adr]
status: decided
updated: 2026-11-13
---
# ADR-002 — N-of-1 Normal-Inverse-Gamma conjugado
**Por qué:** n=4, explicable, O(1) por actualización, predictivo Student-t (colas honestas con pocos datos), olvido λ≈0.98, CUSUM para cambios sostenidos. Alineado con [[Hallazgo clave - Metodologia Artemis II]].
**Aprendido (registrar en model card):** con `prior_n=3` en la varianza, un sd poblacional ancho volvía el modelo "perezoso" (escala 3.95 vs 2 real); separamos `prior_var_n=0.5`. Los tests protegen esto. Código: `services/engine/tether_engine/bayes/nof1.py`.
**Descartado:** redes profundas (sin datos), Isolation Forest solo (poco explicable).
