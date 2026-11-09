"""Blog-run endpoints."""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from langgraph.graph.state import CompiledStateGraph
from pydantic import BaseModel, ConfigDict, Field

from app.config import OUTPUTS_DIR, get_logger
from app.stream import public_markdown, stream_run

logger = get_logger(__name__)

router = APIRouter(prefix="/api")


class RunRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    topic: str = Field(..., min_length=3, max_length=1000, description="The technical blog topic.")


class RunResult(BaseModel):
    run_id: str
    markdown: str


def get_graph(request: Request) -> CompiledStateGraph:
    return request.app.state.graph


@router.post("/runs")
async def create_run(body: RunRequest, graph: CompiledStateGraph = Depends(get_graph)) -> RunResult:
    """Run the whole graph and return the article in one response (handy for /docs and debugging)."""
    run_id = str(uuid.uuid4())
    logger.info("Run %s started: %r", run_id, body.topic)
    out = await graph.ainvoke({"topic": body.topic, "sections": []}, {"configurable": {"thread_id": run_id}})
    return RunResult(run_id=run_id, markdown=public_markdown(out["final"], run_id))


@router.post("/runs/stream")
async def create_run_stream(body: RunRequest, graph: CompiledStateGraph = Depends(get_graph)) -> StreamingResponse:
    """Run the graph and stream progress as Server-Sent Events (see app/stream.py for event types)."""
    run_id = str(uuid.uuid4())
    logger.info("Run %s started (stream): %r", run_id, body.topic)
    return StreamingResponse(
        stream_run(graph, body.topic, run_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/runs/{run_id}/download")
def download_markdown(run_id: uuid.UUID) -> FileResponse:
    # run_id is parsed as a UUID, so it can't contain "../" or other path tricks
    path = OUTPUTS_DIR / str(run_id) / "blog.md"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Run not found")

    title = path.read_text(encoding="utf-8").split("\n", 1)[0].lstrip("# ").strip()
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80] or "blog"
    return FileResponse(path, media_type="text/markdown", filename=f"{slug}.md")
