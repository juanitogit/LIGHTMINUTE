"""API tests: all five endpoints, no network, template mode."""
import os
from contextlib import contextmanager

from fastapi.testclient import TestClient
from tether_engine.api.main import app

CLIENT = TestClient(app)


@contextmanager
def env(**values):
    old = {k: os.environ.get(k) for k in values}
    try:
        for key, value in values.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        yield
    finally:
        for key, value in old.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def test_health_reports_provider_without_leaking_the_key():
    with env(LLM_PROVIDER="deepseek", DEEPSEEK_API_KEY="sk-super-secret-value"):
        r = CLIENT.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["llm_provider"] == "deepseek"
    assert body["llm_key_present"] is True
    assert "sk-super-secret-value" not in r.text
    assert body["synthetic"] is True and body["not_a_medical_device"] is True


def test_health_reports_none_provider_without_a_key():
    with env(LLM_PROVIDER=None, DEEPSEEK_API_KEY=None), env(DEEPSEEK_API_KEY=""):
        body = CLIENT.get("/api/health").json()
    assert body["llm_provider"] == "none"
    assert body["llm_key_present"] is False


def test_scenarios_lists_the_three_contract_names():
    body = CLIENT.get("/api/scenarios").json()
    names = [s["name"] for s in body["scenarios"]]
    assert set(names) == {"cmo_fever", "sep_sleep_loss", "co2_creep"}
    assert body["synthetic"] is True


def test_scenario_returns_days_and_404s_on_unknown():
    r = CLIENT.get("/api/scenario/cmo_fever")
    assert r.status_code == 200
    doc = r.json()
    assert doc["days"] and doc["synthetic"] is True
    assert doc["name"] == "cmo_fever"
    assert CLIENT.get("/api/scenario/not_a_scenario").status_code == 404


def test_card_in_template_mode():
    with env(LLM_PROVIDER="none"):
        r = CLIENT.post("/api/card", json={"scenario": "cmo_fever", "crew": "A", "day": 15})
    assert r.status_code == 200
    body = r.json()
    assert body["card_source"] == "template"
    assert body["verifier_errors"] == []
    assert body["card"]["level"] in ("info", "watch", "act", "escalate")
    assert body["card"]["citations"] and body["synthetic"] is True


def test_card_fast_query_flag_is_accepted():
    with env(LLM_PROVIDER="none"):
        r = CLIENT.post("/api/card?fast=1", json={"scenario": "cmo_fever", "crew": "B", "day": 3})
    assert r.status_code == 200 and r.json()["card_source"] == "template"


def test_card_unknown_scenario_and_day_are_404():
    assert CLIENT.post("/api/card", json={"scenario": "nope", "crew": "A", "day": 1}).status_code == 404
    assert CLIENT.post("/api/card", json={"scenario": "cmo_fever", "crew": "Z", "day": 1}).status_code == 404
    assert CLIENT.post("/api/card", json={"scenario": "cmo_fever", "crew": "A", "day": 200}).status_code == 404


def test_card_validation_errors_are_422():
    assert CLIENT.post("/api/card", json={"scenario": "cmo_fever", "crew": "A", "day": 0}).status_code == 422
    assert CLIENT.post("/api/card", json={"crew": "A", "day": 1}).status_code == 422


def test_llm_stats_shape():
    with env(LLM_PROVIDER="none"):
        body = CLIENT.get("/api/llm-stats").json()
    for key in ("calls", "cache_hit_tokens", "verifier_rejections", "fallbacks",
                "llm_cards", "template_cards", "cache_hit_ratio"):
        assert key in body
    assert body["llm_provider"] == "none"


def test_cors_allows_localhost_only():
    r = CLIENT.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") in ("http://localhost:5173", "*")
    r2 = CLIENT.get("/api/health", headers={"Origin": "https://evil.example"})
    assert r2.headers.get("access-control-allow-origin") is None
