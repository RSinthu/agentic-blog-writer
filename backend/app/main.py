from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from langgraph.checkpoint.memory import InMemorySaver

from app.config import OUTPUTS_DIR, get_logger, get_settings
from app.graph.builder import build_graph, checkpoint_serde
from app.routes import router
from app.tools.tavily_mcp import make_mcp_client

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Load the MCP tools and compile the graph once; every request reuses them
    try:
        tools = await make_mcp_client(settings).get_tools()
        logger.info("Loaded %d Tavily MCP tools", len(tools))
    except Exception as e:
        tools = []
        logger.warning("Tavily MCP unavailable (%s); research will find no evidence", e)

    app.state.graph = build_graph(InMemorySaver(serde=checkpoint_serde()), tools)
    logger.info("Graph ready (model=%s, images=%s)", settings.openai_model, "on" if settings.enable_images else "off")
    yield


app = FastAPI(title="Agentic Blog Writer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Generated articles and images: /outputs/<run_id>/images/<file>.png
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

app.include_router(router)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
