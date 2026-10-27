"""Reducer: stitch the parallel sections back into one article."""

from app.graph.state import State


def merge_content(state: State) -> dict:
    plan = state["plan"]

    # workers finish in any order, so sort by task id
    ordered_sections = [md for _, md in sorted(state["sections"], key=lambda x: x[0])]
    body = "\n\n".join(ordered_sections).strip()
    merged_md = f"# {plan.blog_title}\n\n{body}\n"
    return {"merged_md": merged_md}
