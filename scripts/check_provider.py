#!/usr/bin/env python3
"""Check the configured LLM provider end to end, and say what to fix if it fails.

    python scripts/check_provider.py

Reports: which provider and model are active, whether a key is present (never
the key itself), which models the key can list, and the result of one tiny chat
call. A key can authenticate and still be useless - Groq, for example, blocks
models per project - so the chat call is the part that matters.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "engine"))
load_dotenv(ROOT / ".env", override=True)

from tether_engine.llm import providers  # noqa: E402

CONSOLE_HINT = "https://console.groq.com/settings/project/limits"


def main() -> int:
    name = providers.active_name()
    provider = providers.active()
    print(f"LLM_PROVIDER={providers.requested() or '(unset)'} -> active: {name}")
    if provider is None:
        print("No provider selected. Set LLM_PROVIDER=groq|deepseek, or leave it unset "
              "to pick whichever key exists. Cards fall back to the deterministic template.")
        return 0

    key = providers.key_of(provider)
    masked = f"{key[:6]}...{key[-4:]} ({len(key)} chars)" if len(key) > 12 else "(missing)"
    print(f"key     {provider.key_env}={masked}")
    print(f"model   {provider.model_env}={providers.model_name()}")
    print(f"base    {providers.base_url(provider)}")
    if not key:
        print(f"\nNo key: export {provider.key_env} (or put it in .env).")
        return 1

    client_module = __import__(f"tether_engine.llm.{provider.client_module}",
                               fromlist=["make_client"])
    try:
        client = client_module.make_client()
    except Exception as exc:  # noqa: BLE001
        print(f"\nCould not build the client: {type(exc).__name__}: {exc}")
        return 1

    try:
        ids = sorted(m.id for m in client.models.list().data)
        print(f"\nmodels visible to this key: {len(ids)}")
        for model_id in ids:
            print("  -", model_id)
    except Exception as exc:  # noqa: BLE001
        print(f"\nListing models failed: {type(exc).__name__}: {exc}")

    print(f"\none chat call with {providers.model_name()} ...")
    try:
        client.chat.completions.create(
            model=providers.model_name(),
            messages=[{"role": "user", "content": "Reply with OK."}],
            max_tokens=16,
        )
        print("OK - the provider answers. Decision Cards will come from the model.")
        return 0
    except Exception as exc:  # noqa: BLE001
        detail = ""
        response = getattr(exc, "response", None)
        if response is not None:
            try:
                detail = ((response.json().get("error") or {}).get("message") or "")
            except Exception:  # noqa: BLE001
                detail = getattr(response, "text", "") or ""
        detail = (detail or str(exc)).replace("\n", " ")[:300]
        print(f"FAILED - {type(exc).__name__}: {detail}")
        if "blocked at the project level" in detail:
            print(f"\nThe key is fine, the model is disabled for this project.\n"
                  f"Enable it at {CONSOLE_HINT} (Settings -> Project -> model permissions),\n"
                  f"then run this script again. Until then every card uses the verified template.")
        elif "invalid_api_key" in detail or "401" in str(exc):
            print("\nThe key itself is rejected: regenerate it in the provider console.")
        else:
            print("\nCheck the model id, the base URL and the network path.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
