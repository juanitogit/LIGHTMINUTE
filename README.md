# TETHER
*Your body's baseline — even when Earth is out of reach.*

Health-monitoring and decision-support software for astronauts on long missions. NASA Space Apps 2026 — challenge: **Create Health Monitoring Software for Astronauts on Space Missions**.

> Prototype on **synthetic** crew data. Not a medical device. Real public data (NASA OSDR, NOAA) is labelled and cited.

## What it does
1. Learns each astronaut's own normal (N-of-1 Bayesian) instead of comparing to a population.
2. Adds hazard context (radiation, space weather, cabin CO2).
3. Produces cited, uncertainty-aware **Decision Cards**: what changed, why it matters, what to do now, when to escalate, what to tell Earth given the light delay.
4. Works offline and with the LLM unplugged.

## What makes it different
Three-lens verdicts (Earth / space-adapted / **your own baseline**), a coordinated-shift **syndrome** early warning, crew-level attribution (shared vs individual), delay-aware routing, a hash-chained audit log, and a **comparative validation with stated limitations** (`docs/validation.md`). Interactive reference screen: `apps/crew-tablet/prototype/three-lens.html`.

## Quick start
```bash
cp .env.example .env      # add DEEPSEEK_API_KEY (or set LLM_PROVIDER=none)
make setup && make test
make skills               # expose skills to dsh / Claude Code
make dev
```

## Docs
`docs/ARCHITECTURE.md` · `docs/FOLDER_STRUCTURE.md` · `docs/model-card.md` (to write) · `docs/data-card.md` (to write)

## Use of AI
Built with DeepSeek V4.1 Flash and coding agents; the team reviewed and owns all modelling decisions and content.

## License
Apache-2.0 (add LICENSE).
