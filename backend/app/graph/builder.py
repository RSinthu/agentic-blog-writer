"""Wire the nodes into the blog-writing graph."""

from langchain_core.tools import BaseTool
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.config import get_settings
from app.graph.nodes.orchestrator import orchestrator_node
from app.graph.nodes.reducer import decide_images, finalize, generate_and_place_images, merge_content
from app.graph.nodes.research import make_research_node
from app.graph.nodes.router import route_next, router_node
from app.graph.nodes.worker import fanout, worker_node
from app.graph.state import ReducerOutput, State

# Our Pydantic types stored in State; LangGraph only restores allow-listed types from checkpoints
CHECKPOINT_TYPES = [("app.graph.schemas", name) for name in ("Plan", "Task", "EvidenceItem")]


def checkpoint_serde() -> JsonPlusSerializer:
    """Pass as serde= to any checkpointer, e.g. InMemorySaver(serde=checkpoint_serde())."""
    return JsonPlusSerializer(allowed_msgpack_modules=CHECKPOINT_TYPES)


def build_reducer_graph(enable_images: bool) -> CompiledStateGraph:
    """merge_content -> decide_images -> generate_and_place_images, or merge_content -> finalize."""
    r = StateGraph(State, output_schema=ReducerOutput)
    r.add_node("merge_content", merge_content)
    r.add_edge(START, "merge_content")

    if enable_images:
        r.add_node("decide_images", decide_images)
        r.add_node("generate_and_place_images", generate_and_place_images)
        r.add_edge("merge_content", "decide_images")
        r.add_edge("decide_images", "generate_and_place_images")
        r.add_edge("generate_and_place_images", END)
    else:
        r.add_node("finalize", finalize)
        r.add_edge("merge_content", "finalize")
        r.add_edge("finalize", END)

    return r.compile()


def build_graph(
    checkpointer: BaseCheckpointSaver | None = None,
    tools: list[BaseTool] | None = None,
    enable_images: bool | None = None,
) -> CompiledStateGraph:
    if enable_images is None:
        enable_images = get_settings().enable_images

    g = StateGraph(State)
    g.add_node("router", router_node)
    g.add_node("research", make_research_node(tools or []))
    g.add_node("orchestrator", orchestrator_node)
    g.add_node("worker", worker_node)
    g.add_node("reducer", build_reducer_graph(enable_images))

    g.add_edge(START, "router")
    g.add_conditional_edges("router", route_next, {"research": "research", "orchestrator": "orchestrator"})
    g.add_edge("research", "orchestrator")
    g.add_conditional_edges("orchestrator", fanout, ["worker"])
    g.add_edge("worker", "reducer")
    g.add_edge("reducer", END)

    return g.compile(checkpointer=checkpointer)
