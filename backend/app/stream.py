"""Run the graph and turn its progress into SSE events for the frontend.

Event types (all carry "type"):
  run_started   {run_id, topic}
  stage         {id: router|research|orchestrator|workers|reducer, status: running|done|skipped, ...}
  route         {mode, needs_research, queries}
  sources       {evidence}
  plan          {plan}
  section_done  {task_id, title, done, total}
  images_planned {count}
  final         {run_id, markdown, download_url}
  error         {run_id, message}
"""

import asyncio
import re
from collections.abc import AsyncIterator

from langgraph.graph.state import CompiledStateGraph

from app.config import get_logger
from app.sse import KEEP_ALIVE, create_sse_event, make_serializable, normalize_stream_chunk

logger = get_logger(__name__)

KEEP_ALIVE_SECONDS = 15


def public_markdown(md: str, run_id: str) -> str:
    """blog.md links images relatively (images/x.png); the API serves them at /outputs/<run_id>/images/x.png."""
    return re.sub(r"\]\(images/", f"](/outputs/{run_id}/images/", md)


def _stage(stage_id: str, status: str, **extra) -> dict:
    return {"type": "stage", "id": stage_id, "status": status, **extra}


async def _graph_events(graph: CompiledStateGraph, topic: str, run_id: str) -> AsyncIterator[dict]:
    config = {"configurable": {"thread_id": run_id}}
    task_titles: dict[int, str] = {}
    sections_done = 0

    yield {"type": "run_started", "run_id": run_id, "topic": topic}
    yield _stage("router", "running")

    async for chunk in graph.astream(
        {"topic": topic, "sections": []}, config, stream_mode="updates", subgraphs=True
    ):
        _, updates = normalize_stream_chunk(chunk)

        for node, raw_update in updates.items():
            update = make_serializable(raw_update) or {}

            if node == "router":
                yield {"type": "route", "mode": update["mode"], "needs_research": update["needs_research"], "queries": update["queries"]}
                yield _stage("router", "done")
                if update["needs_research"]:
                    yield _stage("research", "running")
                else:
                    yield _stage("research", "skipped")
                    yield _stage("orchestrator", "running")

            elif node == "research":
                yield {"type": "sources", "evidence": update.get("evidence", [])}
                yield _stage("research", "done")
                yield _stage("orchestrator", "running")

            elif node == "orchestrator":
                plan = update["plan"]
                task_titles = {task["id"]: task["title"] for task in plan["tasks"]}
                yield {"type": "plan", "plan": plan}
                yield _stage("orchestrator", "done")
                yield _stage("workers", "running", total=len(task_titles))

            elif node == "worker":
                for task_id, _section_md in update.get("sections", []):
                    sections_done += 1
                    yield {
                        "type": "section_done",
                        "task_id": task_id,
                        "title": task_titles.get(task_id, ""),
                        "done": sections_done,
                        "total": len(task_titles),
                    }
                if sections_done == len(task_titles):
                    yield _stage("workers", "done")
                    yield _stage("reducer", "running", detail="Merging sections")

            elif node == "decide_images":
                yield {"type": "images_planned", "count": len(update.get("image_specs", []))}

            elif node in ("generate_and_place_images", "finalize"):
                yield _stage("reducer", "done")

            elif node == "reducer":  # the subgraph's output, reported at the top level
                yield {
                    "type": "final",
                    "run_id": run_id,
                    "markdown": public_markdown(update["final"], run_id),
                    "download_url": f"/api/runs/{run_id}/download",
                }


async def stream_run(graph: CompiledStateGraph, topic: str, run_id: str) -> AsyncIterator[str]:
    """SSE body: graph events, plus a keep-alive comment whenever nothing happens for a while."""
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    async def produce() -> None:
        try:
            async for event in _graph_events(graph, topic, run_id):
                await queue.put(create_sse_event(event))
        except Exception as e:
            logger.exception("Run %s failed", run_id)
            await queue.put(create_sse_event({"type": "error", "run_id": run_id, "message": str(e) or type(e).__name__}))
        finally:
            await queue.put(None)

    producer = asyncio.create_task(produce())
    try:
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=KEEP_ALIVE_SECONDS)
            except TimeoutError:
                yield KEEP_ALIVE
                continue
            if item is None:
                break
            yield item
    finally:
        # also runs when the client disconnects: stop the graph instead of spending tokens for nobody
        if not producer.done():
            logger.info("Client disconnected; cancelling run %s", run_id)
            producer.cancel()
