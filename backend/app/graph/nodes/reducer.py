"""Reducer: stitch the parallel sections back into one article."""

from app.config import get_logger
from app.graph.state import State

logger = get_logger(__name__)


def merge_content(state: State) -> dict:
    plan = state["plan"]

    # workers finish in any order, so sort by task id
    ordered_sections = [md for _, md in sorted(state["sections"], key=lambda x: x[0])]
    body = "\n\n".join(ordered_sections).strip()
    merged_md = f"# {plan.blog_title}\n\n{body}\n"
    logger.info("Merged %d sections (%d words)", len(ordered_sections), len(merged_md.split()))
    return {"merged_md": merged_md}
