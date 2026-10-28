"""Router: decide upfront whether the topic needs web research."""

from langchain_core.messages import HumanMessage, SystemMessage

from app.config import get_logger
from app.graph.prompts import ROUTER_SYSTEM
from app.graph.schemas import RouterDecision
from app.graph.state import State
from app.llm import get_llm

logger = get_logger(__name__)


async def router_node(state: State) -> dict:
    decider = get_llm().with_structured_output(RouterDecision)
    decision = await decider.ainvoke(
        [
            SystemMessage(content=ROUTER_SYSTEM),
            HumanMessage(content=f"Topic: {state['topic']}"),
        ]
    )
    logger.info("Router: mode=%s, research=%s, %d queries", decision.mode, decision.needs_research, len(decision.queries))

    return {
        "needs_research": decision.needs_research,
        "mode": decision.mode,
        "queries": decision.queries,
    }


def route_next(state: State) -> str:
    return "research" if state["needs_research"] else "orchestrator"
