"""FastAPI surface for LIGHTMINUTE (A2).

Front ends must fall back to the static JSON in `apps/crew-tablet/public/`
when this API is unreachable - every response here is reproducible from it.

    uvicorn tether_engine.api.main:app --port 8000
"""
from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ..llm.card_service import (
    DEFAULT_EFFORT,
    FAST_EFFORT,
    get_card,
    key_present,
    provider_name,
)
from ..llm.case_data import (
    SCENARIO_NAMES,
    ScenarioNotFound,
    list_scenarios,
    load_scenario,
)
from ..llm.deepseek_client import MODEL
from ..llm.stats import snapshot
from .mission_link import router as mission_link_router

# Keep existing local DeepSeek configuration behavior independently of storage.
load_dotenv(Path(__file__).resolve().parents[4] / ".env", override=False)

VERSION = "0.1.0"

app = FastAPI(
    title="LIGHTMINUTE API",
    version=VERSION,
    description=(
        "Health decision support for crews beyond Earth. Synthetic data only; "
        "not a medical device. The deterministic engine decides numbers and urgency, "
        "the LLM only explains, and everything it writes passes a verifier."
    ),
)

# Local prototyping only: the PWA, the ground console and file:// prototypes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["null"],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class CardRequest(BaseModel):
    scenario: str = Field(..., min_length=1, description="e.g. cmo_fever")
    crew: str = Field(..., min_length=1, max_length=4, description="crew id: A|B|C|D")
    day: int = Field(..., ge=1, le=400, description="mission day as labelled in the scenario")
    fast: bool | None = Field(None, description="true => reasoning effort 'low'")


@app.get("/")
def root() -> dict:
    return {"service": "lightminute-api", "version": VERSION, "docs": "/docs", "synthetic": True,
            "not_a_medical_device": True}


@app.get("/api/health")
def health() -> dict:
    """Liveness + which explanation tier is active. Never returns the key itself."""
    return {
        "status": "ok",
        "service": "lightminute-api",
        "version": VERSION,
        "llm_provider": provider_name(),
        "llm_key_present": key_present(),
        "llm_model": MODEL,
        "default_effort": DEFAULT_EFFORT,
        "fast_effort": FAST_EFFORT,
        "card_fallback": "template",
        "scenarios": list(SCENARIO_NAMES),
        "synthetic": True,
        "not_a_medical_device": True,
    }


@app.get("/api/scenarios")
def scenarios() -> dict:
    return {"synthetic": True, "scenarios": list_scenarios()}


@app.get("/api/scenario/{name}")
def scenario(name: str, days: int = Query(24, ge=1, le=400), seed: int = Query(0)) -> dict:
    try:
        return load_scenario(name, seed=seed, days=days)
    except ScenarioNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/card")
def card(body: CardRequest, fast: int = Query(0, ge=0, le=1)) -> dict:
    try:
        doc = load_scenario(body.scenario)
        result = get_card(body.scenario, body.crew, body.day,
                          fast=bool(body.fast) or bool(fast), scenario_doc=doc)
    except ScenarioNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {**result, "scenario": body.scenario, "crew": body.crew, "day": body.day,
            "source": doc.get("source"), "synthetic": True}


@app.get("/api/llm-stats")
def llm_stats() -> dict:
    return {**snapshot(), "llm_provider": provider_name(), "llm_key_present": key_present()}

app.include_router(mission_link_router)
