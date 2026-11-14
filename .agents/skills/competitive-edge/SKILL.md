---
name: competitive-edge
description: How TETHER positions itself against other NASA Space Apps 2026 astronaut-health projects (AURORA, Crew Health Monitor, VITA, others) - which ideas we reimplemented, where we are stronger, which claims we may and may NOT make, and the exact demo beats that expose the gaps. Use when writing the pitch, README, video, Q&A answers, comparison tables, or deciding whether to build a feature "because they have it".
---
# Competitive edge (ideas studied, code never copied)

## What rivals do well (public READMEs, 2026-11-13)
- **Crew Health Monitor**: Earth-rules vs space-adapted rules side by side; every threshold labelled with a source or "demo parameter"; 3D body; timed emergency walkthroughs; Earth link with delay countdown; offline handbook assistant that says "I don't have that". Deliberately rules-only; all data simulated; live demo does not enforce privacy.
- **AURORA**: offline tablet, personal baselines, NEWS2-style score, anomaly model, PVT-B, encryption, large test suite.
- **VITA**: real-time dashboard streaming, NEWS2-style scoring.

## Our adopted ideas (reimplemented)
Source-labelled thresholds (`protocols/thresholds.py`) · three lenses (`lenses.py`) · delay-aware routing (`ground/delay.py`) · tamper-evident audit chain (`audit.py`) · PVT-B · timed protocol runner (skill `protocol-runner`) · reference-answer-or-"I don't have that" behavior.

## Where we are stronger (and the proof)
1. **Uncertainty everywhere** (credible intervals, confidence) — none visible in rivals.
2. **Syndrome score**: weak coordinated shifts caught early. Proof: `docs/validation.md` — mild-effect recall 70% vs 18% (equal false-alarm budget).
3. **Heterogeneous crews**: population rules collapse (27% strong-effect recall) while N-of-1 holds (88%) — the n=4, "athlete + deconditioned" argument.
4. **Crew-level attribution** (`crew/attribution.py`): shared exposure vs individual.
5. **Hash-chained audit + verifier-guarded LLM** where rivals use no LLM or free rewording.
6. **Comparative validation with limitations stated**.

## Claims we may NOT make
- "Better than X" by name. Compare **approaches** (fixed ranges, NEWS2-style) not teams.
- "N-of-1 z-score alone beats population thresholds" — false in homogeneous crews (see validation limitations).
- Any clinical accuracy. Everything is synthetic; say it.
- Rivals' "no data to learn from" is fair for ML; our answer: N-of-1 needs no training set, it learns the person.

## Demo beats that expose gaps
1. Day 16: HR 72.6 "Normal" on Earth rule, "Unusual for you" (`apps/crew-tablet/prototype/three-lens.html`).
2. Slide the day: syndrome crosses alert line while no single indicator does.
3. Switch crew to heterogeneous: population rule goes silent, personal one doesn't (validation table).
4. Unplug LLM: template card appears; tamper the audit log: chain breaks.

## Q&A
"Why not just rules?" Rules are our Lens 1/2 and stay; Lens 3 adds the person. "Isn't syndrome direction a prior?" Yes — stated limitation; B/B2 remain direction-agnostic.
