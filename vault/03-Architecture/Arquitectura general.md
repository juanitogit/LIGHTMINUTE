---
tags: [arch]
status: decided
updated: 2026-11-13
---
# Arquitectura general
Tres niveles: **Núcleo a bordo** (determinista, offline) → **Explicación** (LLM + verificador, opcional) → **Enlace a tierra** (diferido, con consentimiento).
```mermaid
flowchart LR
  I[Entradas: wearables, hábitat, radiación, manual] --> Q[QC] --> F[(Feature store)] --> B[N-of-1 Bayes + CUSUM] --> X[Fusión de contexto] --> P[Protocolos: info/watch/act/escalate]
  K[(KB citada)] --> L[DeepSeek V4.1 Flash] --> V{Verificador}
  P --> L
  V -->|ok| C[Decision Card]
  V -->|rechazo| T[Plantilla]
  P --> T --> C
  C --> U[Tablet PWA] 
  C --> S[Store-and-forward + retraso] --> G[Consola de tierra]
```
Detalle y contratos: `docs/ARCHITECTURE.md` del repo. Decisiones: [[ADR-001 Motor decide LLM explica]] · [[ADR-002 N-of-1 conjugado]] · [[ADR-003 Cache-stuffing de la KB]] · [[ADR-004 Stack]].

Relacionado: [[00-Home]].
