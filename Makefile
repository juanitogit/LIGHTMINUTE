.PHONY: setup test dev validate lint skills
setup:
	cd services/engine && pip install -e ".[dev]"
	cd apps/crew-tablet && npm ci || true
test:
	python scripts/run_tests.py
dev:
	cd services/engine && uvicorn tether_engine.api.main:app --reload --port 8000 &
	cd apps/crew-tablet && npm run dev
validate:
	python ml/validation/run_all.py
lint:
	cd services/engine && ruff check .
skills:
	bash scripts/link-skills.sh
