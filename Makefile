.PHONY: setup test dev validate lint skills check
PYTHON ?= python
setup:
	$(PYTHON) -m pip install -e "services/engine[dev]"
	cd apps/crew-tablet && npm ci
test:
	$(PYTHON) scripts/run_tests.py
dev:
	cd services/engine && uvicorn tether_engine.api.main:app --reload --port 8000 &
	cd apps/crew-tablet && npm run dev
validate:
	$(PYTHON) ml/validation/run_all.py
lint:
	cd services/engine && ruff check .
skills:
	bash scripts/link-skills.sh
check:
	PYTHON="$(PYTHON)" bash scripts/check_all.sh
