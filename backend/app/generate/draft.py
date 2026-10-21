import json
from typing import Any, get_args

from pydantic import TypeAdapter, ValidationError

from app.generate.block import DEFINITIONS, MAX_TOKENS, VALUE_TYPES, bullets, focus_rule
from app.generate.partial_json import parse_partial_json
from app.models import BlockField

_SYSTEM = (
    "You write blocks of a project status card from rough project notes. Reply with one JSON "
    "object whose keys appear in exactly this order, in this shape: {shape}\n"
    "{definitions}\n"
    "In each block value, use only facts stated in the notes. Never add or change a number; "
    "quote figures exactly as given. Keywords are the exception: they may go beyond the notes "
    "but only as information the notes imply, never as made-up facts. Never use anything from "
    "an excluded list, or its ideas."
)

_KEYWORDS = (
    "a list of 0 to 8 follow-up ideas of one to four words each, implied by the notes: "
    "something the notes point to but do not state, such as a likely risk, a sensible next "
    "action or a figure worth tracking. Each idea must be something that could be written into "
    "a block's text as implied information without inventing a fact, so never make up names, "
    "numbers, dates or events. Never repeat anything a block's value already says, and give no "
    "idea twice. Return an empty list when the notes imply nothing new"
)


def _in_card_order(blocks: list[BlockField]) -> list[BlockField]:
    return [block for block in get_args(BlockField) if block in blocks]


def draft_max_tokens(blocks: list[BlockField]) -> int:
    return sum(MAX_TOKENS[block] for block in blocks) * 3 // 2


def build_draft_messages(
    blocks: list[BlockField],
    source: str,
    exclude: dict[BlockField, list[str]],
    focus: str = "",
) -> list[dict[str, str]]:
    ordered = _in_card_order(blocks)
    lines = [f"- {block}: {DEFINITIONS[block]}." for block in ordered]
    keywords = _KEYWORDS
    if focus:
        keywords += f". Every idea must be about {focus}, never about another team's work"
    lines.append(f"- keywords: {keywords}.")
    shape = ", ".join(f'"{b}": <{b}>' for b in ordered) + ', "keywords": ["..."]'
    system = _SYSTEM.format(shape="{" + shape + "}", definitions="\n".join(lines))
    if focus:
        system += "\n" + focus_rule(focus)
    user = f"Notes:\n{source}\n\nWrite these blocks: {', '.join(ordered)}."
    if focus:
        user += f"\n\n{focus_rule(focus)}"
    for block in ordered:
        if exclude.get(block):
            user += f"\n\nExcluded from {block}, never use:\n{bullets(exclude[block])}"
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def parse_draft(
    blocks: list[BlockField], text: str
) -> tuple[dict[BlockField, Any], list[str], dict[BlockField, str]]:
    parsed = parse_partial_json(text)
    try:
        json.loads(text)
    except json.JSONDecodeError:
        # the reply was cut off, so its last key may be unfinished
        if parsed:
            parsed.popitem()

    values: dict[BlockField, Any] = {}
    failed: dict[BlockField, str] = {}
    for block in blocks:
        if block not in parsed:
            failed[block] = f"The model did not write the {block} block"
            continue
        try:
            values[block] = TypeAdapter(VALUE_TYPES[block]).validate_python(parsed[block])
        except ValidationError as exc:
            failed[block] = f"The model's {block} block was malformed: {exc.errors()[0]['msg']}"

    keywords = parsed.get("keywords")
    suggestions = [k for k in keywords if isinstance(k, str)] if isinstance(keywords, list) else []
    return values, suggestions, failed
