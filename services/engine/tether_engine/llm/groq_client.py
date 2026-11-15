"""Groq client (OpenAI-compatible endpoint).

Groq serves open-weight models on its own LPUs. The model id is read from
`GROQ_MODEL`; the catalogue changes often, so run
`python scripts/check_provider.py` to list what the current key can reach.

Verified against the live API (2026-11-14):
 - base_url: https://api.groq.com/openai/v1
 - `openai/gpt-oss-120b` accepts `response_format={"type": "json_object"}`
   and `reasoning_effort` (low | medium | high)
 - `temperature` is rejected by the reasoning models, so it is not sent
 - Cloudflare in front of the API returns 1010 to clients with a bare urllib
   user-agent; the official SDK is fine.
"""
from __future__ import annotations

import json
import os

MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

# JSON mode needs the word "JSON" in the conversation; the system prefix is kept
# byte-identical for prompt caching, so the reminder rides on the user message.
JSON_REMINDER = "\n\nReturn one JSON object matching the Decision Card schema."


def make_client():
    """Built lazily so `LLM_PROVIDER=none` needs no openai import and no key."""
    from openai import OpenAI

    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
    )


def ask_json(client, *, system_prefix: str, case_payload: dict,
             effort: str = "high", thinking: bool = True, max_tokens: int = 4000) -> dict:
    """One grounded call. `system_prefix` = rules + full KB (cache-friendly)."""
    kwargs = {
        "model": os.environ.get("GROQ_MODEL", MODEL),
        "messages": [
            {"role": "system", "content": system_prefix},
            {"role": "user",
             "content": json.dumps(case_payload, ensure_ascii=False, sort_keys=True) + JSON_REMINDER},
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": max_tokens,
    }
    if thinking:
        # gpt-oss exposes low | medium | high; our caller only uses low | high.
        kwargs["reasoning_effort"] = effort
    resp = client.chat.completions.create(**kwargs)
    msg = resp.choices[0].message
    return {"card": json.loads(msg.content),
            "usage": getattr(resp, "usage", None)}
