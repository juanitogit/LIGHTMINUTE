# TETHER
*Your body's baseline — even when Earth is out of reach.*

Health-monitoring and decision-support software for astronauts on long missions.
NASA Space Apps 2026 — challenge: **Create Health Monitoring Software for Astronauts on Space Missions**.

> **Prototype on synthetic crew data. Not a medical device.** Public data (NOAA, MMASH) is
> labelled and cited in [`docs/data-card.md`](docs/data-card.md).

**Status (2026-11-14):** engine, scenario pipeline, FastAPI service, crew-tablet app
(Glance → Why → Act), ground console and protocol runner are in the repository. Verified on the
merged tree: **76 engine/LLM/pipeline tests pass** and the tablet builds (`npm run build`).
The reference screen [`apps/crew-tablet/prototype/three-lens.html`](apps/crew-tablet/prototype/three-lens.html)
still needs no server at all. Known gap: the forgetting-factor defect below is **not patched in the
shared engine yet**. Layer-by-layer status: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What it does
1. **Learns each astronaut's own normal** (per-person Bayesian N-of-1) instead of comparing
   them to a population average — with n=4, the average does not exist.
2. **Adds hazard context** (space weather, cabin environment) without letting it raise an
   alarm on its own.
3. **Reads coordinated shifts**, not just single spikes: several weak signals moving
   together are stronger evidence than any one of them crossing a line.
4. **Produces cited, uncertainty-aware Decision Cards**: what changed, why it matters, what
   to do now, when to escalate, and what to tell Earth given the light delay.

## What makes it different
- **Three lenses** side by side — Earth rule, space-adapted rule, and *your own baseline* —
  with a named pattern when they disagree. At mission day 16 the demo crew member's resting
  HR of 72.6 bpm is *normal* for the population and *unusual for him* (`hidden_in_range`):
  a fixed range stays silent exactly when it matters.
- **Syndrome early warning** with a crew-level view: shared exposure vs individual finding.
- **Validated honestly, including where it loses** — and we publish the defect we found in
  our own model on real data closer to delivery than we would like.

## The 90-second demo
Open [`apps/crew-tablet/prototype/three-lens.html`](apps/crew-tablet/prototype/three-lens.html)
(no server, no build, no network). Drag the day slider: days 8–14 are ordinary; at day 15 the
combined score crosses 2.33 and at **day 16** the Earth lens says `Normal` while the personal
lens says `Unusual for you` (z=3.3, score 3.48) and the card tells the crew what to re-measure.
The data behind it is real engine output ([`public/demo-data.json`](apps/crew-tablet/public/data/demo-data.json)).

## Validation in one table
Equal false-alarm budget (~0.1 per crew-week), tuning and report seeds disjoint, 500 simulated
crew members per effect size. Full report: [`docs/validation.md`](docs/validation.md).

| Crew scenario | Population rule | N-of-1 syndrome |
|---|---|---|
| Homogeneous, mild change (0.8 sd) | 18% recall | **70%** |
| Homogeneous, moderate (1.6 sd) | 38% | **96%** |
| Heterogeneous, strong (3.0 sd) | 27% | **100%** |

Also measured: 94% pooled coverage of the nominal 95% intervals on healthy days; recall degrades
94% → 84% → 74% with 0/20/40% missing readings; 3/7/14 days of personal history give 74/82/94%.
On real wearable data (MMASH, 22 adults) our interval covered only 21.6% of minutes — we traced it
to a forgetting-factor defect in our own baseline model, proved a fix that restores 93.4%, and
shipped the diagnostic (`ml/diagnostics/forgetting_drift.py`). It is not patched in the shared
engine yet; see [`docs/model-card.md`](docs/model-card.md).

## What is real and what is synthetic
| | |
|---|---|
| `synthetic` | All crew data, every scenario, all recall/delay numbers |
| `proxy` | MMASH wearable data (22 healthy volunteers) for interval honesty only |
| `real-public` | NOAA SWPC GOES proton flux snapshot, with sha256 in `data/snapshots/manifest.json` |

## Quick start (5 commands)
```bash
python -m venv .venv && .venv/bin/pip install numpy scipy     # Windows: .venv\Scripts\pip
.venv/bin/python scripts/run_tests.py                          # 23 engine + verifier tests
.venv/bin/python ml/validation/run_all.py                      # regenerates docs/validation.md (~2.5 min)
.venv/bin/python scripts/fetch_noaa.py                         # real space-weather snapshot + panel
# then open apps/crew-tablet/prototype/three-lens.html in a browser
```
Optional real-data proxy: `python scripts/fetch_mmash.py` (24 MB) and `python ml/proxy/mmash.py`.

The full app (two more commands, needs Node):
```bash
cd apps/crew-tablet && npm ci && npm run build      # tablet app; lib/ holds packages/protocol-runner
cd services/engine && uvicorn tether_engine.api.main:app --port 8000   # optional API
```
The LLM layer is optional by design: with `LLM_PROVIDER=none` every card comes from the
deterministic template and the product still works.

## Docs
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/validation.md`](docs/validation.md) ·
[`docs/model-card.md`](docs/model-card.md) · [`docs/data-card.md`](docs/data-card.md) ·
[`docs/DEMO_DATA_CONTRACT.md`](docs/DEMO_DATA_CONTRACT.md) · [`ml/proxy/README.md`](ml/proxy/README.md)

## Limitations we state up front
- Synthetic data only; **no clinical validation, no diagnosis, no doses**, not a medical device.
- The simulator is Gaussian with four independent indicators and no circadian or exercise
  context in the shared fixture; real data is harder (our MMASH run shows how hard).
- Single-indicator N-of-1 z-scores are **not** meaningfully better than a population rule in a
  homogeneous crew. The gains come from the syndrome score, CUSUM and heterogeneity.
- The syndrome score knows a clinical direction, so it is blind to changes in other directions.
- An open defect limits any minute-level streaming use of the current engine (daily cadence is
  unaffected); see the model card.

## Use of AI
Built with DeepSeek V4.1 Flash (`deepseek-flash`) and coding agents; the team reviewed and owns
all modelling decisions, thresholds, claims and copy. The LLM in the product is an explanation
layer behind a deterministic verifier and is replaceable.

## License and credits
Apache-2.0 (see `LICENSE`). Data credits and licenses: [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).
Space-weather data: NOAA SWPC (public domain). Proxy data: MMASH via PhysioNet (ODbL 1.0).
