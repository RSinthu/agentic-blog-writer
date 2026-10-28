"""Tavily web search through Tavily's hosted MCP server."""

import asyncio
import json
import re

from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient

from app.config import Settings, get_logger

logger = get_logger(__name__)

TAVILY_MCP_URL = "https://mcp.tavily.com/mcp/"
SEARCH_TOOL_NAMES = ("tavily_search", "tavily-search")  # renamed across server versions


def make_mcp_client(settings: Settings) -> MultiServerMCPClient:
    if not settings.tavily_api_key:
        raise RuntimeError("TAVILY_API_KEY is missing. Add it to backend/.env")

    # Remote server over HTTP: no local Node subprocess, so no Windows event-loop issues.
    # The key goes in a header rather than the URL so it never shows up in logged URLs.
    return MultiServerMCPClient(
        {
            "tavily": {
                "transport": "streamable_http",
                "url": TAVILY_MCP_URL,
                "headers": {"Authorization": f"Bearer {settings.tavily_api_key}"},
            }
        }
    )


def find_search_tool(tools: list[BaseTool]) -> BaseTool:
    for tool in tools:
        if tool.name in SEARCH_TOOL_NAMES:
            return tool
    raise RuntimeError(f"No Tavily search tool found. Got: {[t.name for t in tools]}")


def _result_text(raw: object) -> str:
    # MCP tools return content blocks: [{"type": "text", "text": "..."}]
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list):
        return "\n".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in raw)
    return str(raw)


def _parse_results(raw: object) -> list[dict]:
    text = _result_text(raw)

    try:
        payload = json.loads(text)
        results = payload.get("results", []) if isinstance(payload, dict) else payload
    except json.JSONDecodeError:
        # older servers return "Title: ...\nURL: ...\nContent: ..." blocks
        results = [
            {"title": m["title"], "url": m["url"], "content": m["content"]}
            for m in re.finditer(
                r"Title:\s*(?P<title>.*?)\s*\nURL:\s*(?P<url>\S+)\s*\nContent:\s*(?P<content>.*?)(?=\n\s*Title:|\Z)",
                text,
                re.S,
            )
        ]
        if not results:
            # e.g. a rate-limit or error message: say so instead of silently returning nothing
            logger.warning("Unrecognised Tavily response: %r", text[:200])

    normalized: list[dict] = []
    for r in results or []:
        if not isinstance(r, dict):
            continue
        normalized.append(
            {
                "title": r.get("title") or "",
                "url": r.get("url") or "",
                "snippet": r.get("content") or r.get("snippet") or "",
                "published_at": r.get("published_date") or r.get("published_at"),
                "source": r.get("source"),
            }
        )
    return normalized


async def tavily_search(tools: list[BaseTool], query: str, max_results: int = 5) -> list[dict]:
    tool = find_search_tool(tools)
    raw = await tool.ainvoke({"query": query, "max_results": max_results})
    return _parse_results(raw)


async def search_many(tools: list[BaseTool], queries: list[str], max_results: int = 5) -> list[dict]:
    """Run all queries concurrently; a failed query is logged and skipped."""
    outcomes = await asyncio.gather(
        *(tavily_search(tools, q, max_results) for q in queries),
        return_exceptions=True,
    )

    results: list[dict] = []
    for query, outcome in zip(queries, outcomes):
        if isinstance(outcome, BaseException):
            logger.warning("Tavily search failed for %r: %s", query, outcome)
            continue
        results.extend(outcome)

    ok = sum(not isinstance(o, BaseException) for o in outcomes)
    logger.info("Tavily: %d/%d queries succeeded, %d results", ok, len(queries), len(results))
    return results
