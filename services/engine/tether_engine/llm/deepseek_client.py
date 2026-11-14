"""Thin DeepSeek V4.1 Flash client (OpenAI-compatible endpoint).

Facts taken from api-docs.deepseek.com (checked 2026-11-13):
 - model name: "deepseek-flash"   base_url: https://api.deepseek.com
 - thinking is ON by default (effort "high"); set effort low|high|max
 - in thinking mode temperature/penalties are ignored; top_p is 0.95-1.0
 - with `tools`, reasoning_content MUST be passed back on later requests,
   otherwise the API returns HTTP 400 -> always append the full message object.
 - disk context caching: keep the big stable prefix (system prompt + KB) FIRST
   and byte-identical between calls; only the tail (case data) may change.
UNVERIFIED here (check the JSON-output guide): response_format json_object.
"""
from __future__ import annotations
import os, json
from openai import OpenAI

MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-flash")


def make_client() -> OpenAI:
    return OpenAI(api_key=os.environ["DEEPSEEK_API_KEY"],
                  base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com"))


def ask_json(client, *, system_prefix: str, case_payload: dict,
             effort: str = "high", thinking: bool = True, max_tokens: int = 4000) -> dict:
    """One grounded call. `system_prefix` = rules + full KB (cache-friendly)."""
    kwargs = dict(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prefix},
            {"role": "user", "content": json.dumps(case_payload, ensure_ascii=False, sort_keys=True)},
        ],
        response_format={"type": "json_object"},
        max_tokens=max_tokens,
        extra_body={"thinking": {"type": "enabled" if thinking else "disabled"}},
    )
    if thinking:
        kwargs["reasoning_effort"] = effort      # low | high | max
    resp = client.chat.completions.create(**kwargs)
    msg = resp.choices[0].message
    return {"card": json.loads(msg.content),
            "usage": getattr(resp, "usage", None)}
