"""Orchestrator: turn the topic (and any evidence) into a section-by-section Plan."""

from langchain_core.messages import HumanMessage, SystemMessage

from app.graph.prompts import ORCH_SYSTEM
from app.graph.schemas import Plan
from app.graph.state import State
from app.llm import get_llm


async def orchestrator_node(state: State) -> dict:
    planner = get_llm().with_structured_output(Plan)

    evidence = state.get("evidence", []) or []
    mode = state.get("mode", "closed_book")

    plan = await planner.ainvoke(
        [
            SystemMessage(content=ORCH_SYSTEM),
            HumanMessage(
                content=(
                    f"Topic: {state['topic']}\n"
                    f"Mode: {mode}\n\n"
                    f"Evidence (ONLY use for fresh claims; may be empty):\n"
                    f"{[e.model_dump() for e in evidence][:16]}"
                )
            ),
        ]
    )

    return {"plan": plan}
