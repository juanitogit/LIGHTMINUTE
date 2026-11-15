"""Which LLM explains a Decision Card: one registry, no hard-coded constants.

Every supported provider is OpenAI-compatible, so the only differences are the
key, the base URL, the model id and whether the vendor understands
`reasoning_effort` / DeepSeek's `thinking` flag.

Both providers are optional. With no key, an unknown provider or
`LLM_PROVIDER=none`, cards come from the deterministic template and the process
makes zero network calls - that is a product requirement, not a fallback of
last resort.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

NONE = "none"


@dataclass(frozen=True)
class Provider:
    name: str
    client_module: str
    key_env: str
    base_url_env: str
    model_env: str
    default_base_url: str
    default_model: str
    reasoning_effort: bool          # vendor understands OpenAI's reasoning_effort


PROVIDERS: dict[str, Provider] = {
    "groq": Provider(
        name="groq",
        client_module="groq_client",
        key_env="GROQ_API_KEY",
        base_url_env="GROQ_BASE_URL",
        model_env="GROQ_MODEL",
        default_base_url="https://api.groq.com/openai/v1",
        default_model="openai/gpt-oss-120b",
        reasoning_effort=True,
    ),
    "deepseek": Provider(
        name="deepseek",
        client_module="deepseek_client",
        key_env="DEEPSEEK_API_KEY",
        base_url_env="DEEPSEEK_BASE_URL",
        model_env="DEEPSEEK_MODEL",
        default_base_url="https://api.deepseek.com",
        default_model="deepseek-flash",
        reasoning_effort=True,
    ),
}

# With LLM_PROVIDER unset we use the first provider that actually has a key.
AUTO_ORDER = ("groq", "deepseek")


def requested() -> str:
    return (os.environ.get("LLM_PROVIDER") or "").strip().lower()


def active_name() -> str:
    """The provider in use. An unrecognised name is reported verbatim, never hidden."""
    raw = requested()
    if raw in ("", "auto"):
        for name in AUTO_ORDER:
            if key_of(PROVIDERS[name]):
                return name
        return NONE
    return raw


def active() -> Provider | None:
    return PROVIDERS.get(active_name())


def key_of(provider: Provider) -> str:
    return (os.environ.get(provider.key_env) or "").strip()


def key_present() -> bool:
    """Never returns or logs the key itself."""
    provider = active()
    return bool(provider and key_of(provider))


def model_name() -> str:
    provider = active()
    if provider is None:
        return NONE
    return (os.environ.get(provider.model_env) or "").strip() or provider.default_model


def base_url(provider: Provider) -> str:
    return (os.environ.get(provider.base_url_env) or "").strip() or provider.default_base_url
