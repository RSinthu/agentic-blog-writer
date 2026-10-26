from functools import lru_cache

from langchain_openai import ChatOpenAI

from app.config import get_settings


@lru_cache
def get_llm(model: str | None = None) -> ChatOpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to backend/.env")

    # No temperature: reasoning models (gpt-5*) only accept the default.
    return ChatOpenAI(
        model=model or settings.openai_model,
        api_key=settings.openai_api_key,
    )
