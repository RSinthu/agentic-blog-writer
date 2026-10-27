"""Workers: one per planned section, run in parallel via Send()."""

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.types import Send

from app.graph.prompts import WORKER_SYSTEM
from app.graph.schemas import EvidenceItem, Plan, Task
from app.graph.state import State, WorkerState
from app.llm import get_llm


def fanout(state: State) -> list[Send]:
    return [
        Send(
            "worker",
            {
                "task": task.model_dump(),
                "topic": state["topic"],
                "mode": state.get("mode", "closed_book"),
                "plan": state["plan"].model_dump(),
                "evidence": [e.model_dump() for e in state.get("evidence", []) or []],
            },
        )
        for task in state["plan"].tasks
    ]


async def worker_node(payload: WorkerState) -> dict:
    task = Task(**payload["task"])
    plan = Plan(**payload["plan"])
    evidence = [EvidenceItem(**e) for e in payload.get("evidence", [])]
    topic = payload["topic"]
    mode = payload.get("mode", "closed_book")

    bullets_text = "\n- " + "\n- ".join(task.bullets)

    evidence_text = ""
    if evidence:
        evidence_text = "\n".join(
            f"- {e.title} | {e.url} | {e.published_at or 'date:unknown'}".strip()
            for e in evidence[:20]
        )

    response = await get_llm().ainvoke(
        [
            SystemMessage(content=WORKER_SYSTEM),
            HumanMessage(
                content=(
                    f"Blog title: {plan.blog_title}\n"
                    f"Audience: {plan.audience}\n"
                    f"Tone: {plan.tone}\n"
                    f"Blog kind: {plan.blog_kind}\n"
                    f"Constraints: {plan.constraints}\n"
                    f"Topic: {topic}\n"
                    f"Mode: {mode}\n\n"
                    f"Section title: {task.title}\n"
                    f"Goal: {task.goal}\n"
                    f"Target words: {task.target_words}\n"
                    f"Tags: {task.tags}\n"
                    f"requires_research: {task.requires_research}\n"
                    f"requires_citations: {task.requires_citations}\n"
                    f"requires_code: {task.requires_code}\n"
                    f"Bullets:{bullets_text}\n\n"
                    f"Evidence (ONLY use these URLs when citing):\n{evidence_text}\n"
                )
            ),
        ]
    )

    # .text flattens content blocks, so this works for both Chat Completions and Responses API output
    return {"sections": [(task.id, response.text.strip())]}
