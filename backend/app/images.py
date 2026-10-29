"""Image generation with OpenAI's GPT image models."""

import base64
from functools import lru_cache

from openai import AsyncOpenAI

from app.config import get_settings


@lru_cache
def _client() -> AsyncOpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to backend/.env")
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def generate_image_bytes(prompt: str, size: str = "1024x1024", quality: str = "medium") -> bytes:
    """Return PNG bytes. size/quality take ImageSpec's values, which GPT image models accept as-is."""
    resp = await _client().images.generate(
        model=get_settings().openai_image_model,
        prompt=prompt,
        size=size,
        quality=quality,
        output_format="png",
        n=1,
    )

    b64 = resp.data[0].b64_json if resp.data else None
    if not b64:
        raise RuntimeError("No image data returned (safety filter, quota or model change).")
    return base64.b64decode(b64)
