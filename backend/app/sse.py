"""Server-Sent Events helpers."""

import json
from typing import Any

from fastapi.encoders import jsonable_encoder

KEEP_ALIVE = ": keep-alive\n\n"  # SSE comment line; clients ignore it, proxies see traffic


def make_serializable(value: Any) -> Any:
    """Recursively turn Pydantic models, tuples and sets into JSON-friendly values."""
    if hasattr(value, "model_dump"):
        return make_serializable(value.model_dump())
    if isinstance(value, dict):
        return {str(key): make_serializable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [make_serializable(item) for item in value]
    return value


def create_sse_event(payload: dict[str, Any], event_name: str | None = None) -> str:
    """Format a dict as one SSE message: optional `event:` line, a `data:` line, blank line."""
    encoded_payload = json.dumps(jsonable_encoder(payload), ensure_ascii=False)

    lines: list[str] = []
    if event_name:
        lines.append(f"event: {event_name}")
    lines.append(f"data: {encoded_payload}")
    return "\n".join(lines) + "\n\n"


def normalize_stream_chunk(chunk: Any) -> tuple[tuple[str, ...], dict[str, Any]]:
    """LangGraph with subgraphs=True yields (namespace, {node: update}); plain dicts otherwise.

    Example: (("reducer:<task-id>",), {"merge_content": {...}})
    """
    if isinstance(chunk, tuple) and len(chunk) == 2 and isinstance(chunk[1], dict):
        namespace = tuple(str(item) for item in (chunk[0] or ()))
        return namespace, chunk[1]
    if isinstance(chunk, dict):
        return (), chunk
    return (), {}
