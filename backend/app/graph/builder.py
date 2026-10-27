"""Wire the nodes into the blog-writing graph."""

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.graph.nodes.orchestrator import orchestrator_node
from app.graph.nodes.reducer import merge_content
from app.graph.nodes.router import router_node
from app.graph.nodes.worker import fanout, worker_node
from app.graph.state import State


def build_graph(checkpointer: BaseCheckpointSaver | None = None) -> CompiledStateGraph:
    g = StateGraph(State)
    g.add_node("router", router_node)
    g.add_node("orchestrator", orchestrator_node)
    g.add_node("worker", worker_node)
    g.add_node("merge_content", merge_content)

    g.add_edge(START, "router")
    g.add_edge("router", "orchestrator")
    g.add_conditional_edges("orchestrator", fanout, ["worker"])
    g.add_edge("worker", "merge_content")
    g.add_edge("merge_content", END)

    return g.compile(checkpointer=checkpointer)
