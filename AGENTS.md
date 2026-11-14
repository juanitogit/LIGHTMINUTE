# AGENTS.md — LIGHTMINUTE (NASA Space Apps 2026)

Read `.agents/skills/tether-product-brief/SKILL.md` first. Skills in `.agents/skills/` load on demand.

## Invariants (never violate)
1. The deterministic engine decides numbers and urgency. The LLM only explains. The product must run with `LLM_PROVIDER=none`.
2. Synthetic data only; always labelled `synthetic` / `proxy` / `real-public`. No real personal health data anywhere.
3. No diagnosis language. Not a medical device. Every claim cites a KB id (`kb/evidence.yaml`) or is marked `unverified`.
4. Don't invent numbers, thresholds, endpoints or citations. If unsure: search the source, or write `unverified`.
5. Tests first for engine/verifier changes. Don't tune on the scenarios you report.

## Commands (use only these)
`make setup` · `make test` (or `python scripts/run_tests.py`) · `make dev` · `make validate` · `make lint` · `make skills`

## Layout
`services/engine` Python (FastAPI + Bayesian engine + LLM layer) · `apps/crew-tablet` PWA (Glance/Why/Act) · `apps/ground-console` · `packages/schemas` JSON-schema -> TS types · `kb/` cited knowledge base · `llm/` prompts & schemas · `data/` snapshots & synthetic · `ml/validation` · `docs/`.

## Style
Python 3.11+, type hints, ruff. TypeScript strict. Small functions, pure where possible. Comments explain *why*. Commit small; keep `main` demo-able at all times.

## Models
DeepSeek `deepseek-flash` (V4.1 Flash). See `deepseek-flash-playbook`. Temperature 1.0 / top_p 0.95 for agentic coding runs; effort `high` default, `max` for hard debugging.

## Memory
Log decisions/facts in the Obsidian vault (`obsidian-vault-ops`). Update `docs/` when behavior changes.
