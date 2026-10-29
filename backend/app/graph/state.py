"""Graph state shared by every node"""

import operator
from typing import Annotated, TypedDict

from app.graph.schemas import EvidenceItem, Plan


class State(TypedDict):
    topic: str

    # routing / research
    mode: str
    needs_research: bool
    queries: list[str]
    evidence: list[EvidenceItem]
    plan: Plan | None

    # workers: parallel writers append here; operator.add merges their lists
    sections: Annotated[list[tuple[int, str]], operator.add]  # (task_id, section_md)

    # reducer/image
    merged_md: str
    md_with_placeholders: str
    image_specs: list[dict]

    final: str


class ReducerOutput(TypedDict, total=False):
    """What the reducer subgraph hands back to the main graph.

    Without this, the subgraph returns its whole state, and the parent's operator.add
    on `sections` would append every section a second time.
    """

    merged_md: str
    md_with_placeholders: str
    image_specs: list[dict]
    final: str


class WorkerState(TypedDict):
    """Payload that fanout() sends to each worker via Send()."""

    task: dict
    topic: str
    mode: str
    plan: dict
    evidence: list[dict]
