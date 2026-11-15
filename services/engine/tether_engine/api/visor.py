"""Grounded visor assistant for the helmet HUD.

The deterministic engine still decides every number the page shows. This
endpoint only lets the configured LLM explain those exact values, so it refuses
to run without a key and refuses to pass through anything the page did not
display. No diagnosis, no invented thresholds, no invented citations.

    POST /api/visor/answer
    {"question": "...", "context": {"heart_rate_bpm": 96, ...}}

The published static build uses the mirrored Cloudflare Pages Function in
`apps/crew-tablet/functions/api/visor/answer.ts`; both keep the same rules.
"""
from __future__ import annotations

import json

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..llm import providers

SYSTEM = """You are the LIGHTMINUTE helmet-visor assistant. The crew member asks about the values currently displayed on the page.
Rules, in order of priority:
1. Use ONLY the numbers and labels in the supplied context JSON. Every number you say must appear there, unchanged.
2. If the context does not contain the answer, say that this page does not include that data. Never estimate or fill gaps.
3. Never diagnose, name a disease as a conclusion, prescribe, or recommend treatment or a dose. Describe what the values show and, if useful, name which displayed field is unusual. The app is a synthetic training simulation, not a medical device.
4. Do not invent thresholds, citations, sources or normal ranges: none are provided beyond what the context states.
5. Answer in the same language as the question, every sentence in that language. Use the page's human labels (CO₂ del traje, frecuencia cardíaca, temperatura central), translated into that language if needed, so no sentence mixes two languages. Never say raw field names such as co2_ppm.
6. At most 90 words, plain sentences meant to be read aloud. No markdown, no lists, no emoji."""

NUMERIC_KEYS = (
    "day", "max_day", "integrity_score", "heart_rate_bpm", "core_temp_c", "sleep_h",
    "pvt_ms", "co2_ppm", "headache_0_10", "radiation_scale", "radiation_pfu",
)
TEXT_KEYS = ("page", "scenario", "crew", "level", "body")


class VisorQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=600)
    context: dict
    # Detected by the client from the question itself: the model follows this
    # directive more reliably than rule 5 alone.
    language: Literal["en", "es"] | None = None


def sanitize(context: dict) -> dict:
    """Whitelisted copy: the model never sees arbitrary client text."""
    clean: dict = {}
    for key in NUMERIC_KEYS:
        value = context.get(key)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            clean[key] = value
    for key in TEXT_KEYS:
        value = context.get(key)
        if isinstance(value, str) and 0 < len(value) <= 120:
            clean[key] = value
    headline = context.get("headline")
    clean["headline"] = headline[:240] if isinstance(headline, str) and headline else None
    return clean


def create_router() -> APIRouter:
    router = APIRouter(prefix="/api/visor", tags=["Visor voice assistant"])

    @router.post("/answer")
    def answer(body: VisorQuestion):
        provider = providers.active()
        if provider is None or not providers.key_of(provider):
            raise HTTPException(503, "El asistente necesita un proveedor LLM con clave (GROQ_API_KEY).")
        context = sanitize(body.context)
        if len(context) < 4:
            raise HTTPException(422, "Falta el contexto de la página.")

        from openai import OpenAI

        client = OpenAI(api_key=providers.key_of(provider), base_url=providers.base_url(provider))
        directive = {"en": "\n\nAnswer strictly in English.", "es": "\n\nResponde estrictamente en español."}.get(
            body.language or "", "")
        kwargs = {
            "model": providers.model_name(),
            "messages": [
                {"role": "system", "content": SYSTEM + directive},
                {"role": "user", "content": json.dumps(
                    {"question": body.question.strip(), "page": context}, ensure_ascii=False)},
            ],
            "max_tokens": 400,
        }
        if provider.reasoning_effort:
            # gpt-oss rejects `temperature`; low effort answers in ~2 s.
            kwargs["reasoning_effort"] = "low"
        try:
            response = client.chat.completions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 -- an upstream failure must not expose the key
            raise HTTPException(502, f"El proveedor LLM falló ({type(exc).__name__}).") from exc
        content = response.choices[0].message.content if response.choices else None
        if not isinstance(content, str) or not content.strip():
            raise HTTPException(502, "El proveedor LLM devolvió una respuesta vacía.")
        return {"answer": content.strip(), "provider": provider.name, "model": providers.model_name(),
                "synthetic": True, "not_a_medical_device": True}

    return router


router = create_router()
