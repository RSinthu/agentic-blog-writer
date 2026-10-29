"""Reducer: stitch the parallel sections into one article, optionally add images, and save it."""

import asyncio
import re
import uuid
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.config import OUTPUTS_DIR, get_logger
from app.graph.prompts import DECIDE_IMAGES_SYSTEM
from app.graph.schemas import GlobalImagePlan
from app.graph.state import State
from app.images import generate_image_bytes
from app.llm import get_llm

logger = get_logger(__name__)

MAX_IMAGES = 3  # DECIDE_IMAGES_SYSTEM allows at most 3
MIN_TEXT_KEPT = 0.9  # decide_images must give back at least 90% of the article's words
PLACEHOLDER_RE = re.compile(r"\[\[IMAGE_\d+\]\]")


# -----------------------------
# Helpers
# -----------------------------
def _run_dir(config: RunnableConfig) -> Path:
    """outputs/<thread_id>/ — the thread_id doubles as the run id."""
    run_id = (config.get("configurable") or {}).get("thread_id")
    if not run_id:
        run_id = uuid.uuid4().hex
        logger.warning("No thread_id in config; saving under outputs/%s", run_id)
    if not re.fullmatch(r"[A-Za-z0-9_-]+", str(run_id)):
        raise ValueError(f"Unsafe run id for a folder name: {run_id!r}")
    return OUTPUTS_DIR / str(run_id)


def _save_markdown(config: RunnableConfig, md: str) -> Path:
    path = _run_dir(config) / "blog.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(md, encoding="utf-8")
    logger.info("Saved %s", path)
    return path


def _safe_filename(name: str, index: int, taken: set[str]) -> str:
    """The model picks file names, so reduce them to a plain, unique `stem.png`."""
    stem = re.sub(r"[^a-z0-9_-]+", "_", Path(name).stem.lower()).strip("_") or f"image_{index}"
    filename = f"{stem}.png"
    if filename in taken:
        filename = f"{stem}_{index}.png"
    taken.add(filename)
    return filename


# -----------------------------
# Nodes
# -----------------------------
def merge_content(state: State) -> dict:
    plan = state["plan"]

    # workers finish in any order, so sort by task id
    ordered_sections = [md for _, md in sorted(state["sections"], key=lambda x: x[0])]
    body = "\n\n".join(ordered_sections).strip()
    merged_md = f"# {plan.blog_title}\n\n{body}\n"
    logger.info("Merged %d sections (%d words)", len(ordered_sections), len(merged_md.split()))
    return {"merged_md": merged_md}


def finalize(state: State, config: RunnableConfig) -> dict:
    """Images disabled: the merged article is the final article."""
    md = state["merged_md"]
    _save_markdown(config, md)
    return {"final": md}


async def decide_images(state: State) -> dict:
    merged_md = state["merged_md"]
    plan = state["plan"]

    planner = get_llm().with_structured_output(GlobalImagePlan)
    image_plan = await planner.ainvoke(
        [
            SystemMessage(content=DECIDE_IMAGES_SYSTEM),
            HumanMessage(
                content=(
                    f"Blog kind: {plan.blog_kind}\n"
                    f"Topic: {state['topic']}\n\n"
                    "Insert placeholders + propose image prompts.\n\n"
                    f"{merged_md}"
                )
            ),
        ]
    )
    md = image_plan.md_with_placeholders

    # The model re-writes the whole article to insert placeholders; refuse a version that lost text
    kept = len(PLACEHOLDER_RE.sub("", md).split()) / max(len(merged_md.split()), 1)
    if kept < MIN_TEXT_KEPT:
        logger.warning("Image planner dropped text (kept %.0f%% of words); skipping images", kept * 100)
        return {"md_with_placeholders": merged_md, "image_specs": []}

    specs = [img for img in image_plan.images if img.placeholder in md][:MAX_IMAGES]
    if len(specs) < len(image_plan.images):
        logger.warning("Dropped %d image specs (placeholder missing or over the limit)", len(image_plan.images) - len(specs))

    logger.info("Images planned: %d", len(specs))
    return {"md_with_placeholders": md, "image_specs": [img.model_dump() for img in specs]}


async def generate_and_place_images(state: State, config: RunnableConfig) -> dict:
    md = state.get("md_with_placeholders") or state["merged_md"]
    image_specs = state.get("image_specs", []) or []

    if image_specs:
        images_dir = _run_dir(config) / "images"
        images_dir.mkdir(parents=True, exist_ok=True)

        taken: set[str] = set()
        filenames = [_safe_filename(spec["filename"], i, taken) for i, spec in enumerate(image_specs, start=1)]

        # generate all images at once; a failure becomes a visible note instead of breaking the article
        outcomes = await asyncio.gather(
            *(generate_image_bytes(spec["prompt"], spec["size"], spec["quality"]) for spec in image_specs),
            return_exceptions=True,
        )

        for spec, filename, outcome in zip(image_specs, filenames, outcomes):
            if isinstance(outcome, BaseException):
                logger.warning("Image %s failed: %s", filename, outcome)
                block = (
                    f"> **[IMAGE GENERATION FAILED]** {spec.get('caption', '')}\n>\n"
                    f"> **Alt:** {spec.get('alt', '')}\n>\n"
                    f"> **Prompt:** {spec.get('prompt', '')}\n>\n"
                    f"> **Error:** {outcome}\n"
                )
            else:
                (images_dir / filename).write_bytes(outcome)
                # relative to blog.md, so the saved file renders as-is
                block = f"![{spec['alt']}](images/{filename})\n*{spec['caption']}*"
            md = md.replace(spec["placeholder"], block)

    md = PLACEHOLDER_RE.sub("", md)  # any placeholder the model inserted without a spec
    _save_markdown(config, md)
    return {"final": md}
