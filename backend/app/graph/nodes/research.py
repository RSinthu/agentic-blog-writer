"""Research: search Tavily (via MCP) for the router's queries and distil the results into evidence."""

from collections.abc import Awaitable, Callable

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import BaseTool

from app.config import get_logger
from app.graph.prompts import RESEARCH_SYSTEM
from app.graph.schemas import EvidencePack
from app.graph.state import State
from app.llm import get_llm
from app.tools.tavily_mcp import search_many

logger = get_logger(__name__)

MAX_QUERIES = 10  # ROUTER_SYSTEM asks for 3–10
MAX_RESULTS_PER_QUERY = 6


def make_research_node(tools: list[BaseTool]) -> Callable[[State], Awaitable[dict]]:
    async def research_node(state: State) -> dict:
        queries = (state.get("queries", []) or [])[:MAX_QUERIES]
        raw_results = await search_many(tools, queries, max_results=MAX_RESULTS_PER_QUERY)

        if not raw_results:
            logger.warning("Research: no search results for %d queries; planning without evidence", len(queries))
            return {"evidence": []}

        extractor = get_llm().with_structured_output(EvidencePack)
        pack = await extractor.ainvoke(
            [
                SystemMessage(content=RESEARCH_SYSTEM),
                HumanMessage(content=f"Raw results:\n{raw_results}"),
            ]
        )

        # Deduplicate by URL
        dedup = {e.url: e for e in pack.evidence if e.url}
        logger.info("Research: %d raw results -> %d evidence items", len(raw_results), len(dedup))
        return {"evidence": list(dedup.values())}

    return research_node
