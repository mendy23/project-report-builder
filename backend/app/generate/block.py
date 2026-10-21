import json
from typing import Any

from pydantic import BaseModel, TypeAdapter

from app.models import BlockField, Metric, Status

VALUE_TYPES: dict[str, Any] = {
    "title": str,
    "status": Status,
    "summary": str,
    "kpi": list[Metric],
    "risks": list[str],
    "next_steps": list[str],
}

DEFINITIONS = {
    "title": "a short project name (2 to 5 words) taken from the input",
    "status": (
        '"on_track", "at_risk" or "blocked": blocked only if work has stopped, '
        "at_risk if there are open risks or delays, otherwise on_track"
    ),
    "summary": (
        "two or three sentences on overall progress and where the project stands; "
        "do not list risks or next steps"
    ),
    "kpi": (
        "a list of {label, value} for measurable figures only (numbers with units); "
        "copy each value exactly as written"
    ),
    "risks": (
        "a list of short strings: problems, blockers, delays or things that could go wrong; "
        "not finished work"
    ),
    "next_steps": (
        "a list of short strings: planned future actions, with dates or owners when the "
        "notes give them"
    ),
}

_ENHANCE_SYSTEM = (
    "You revise one block of a project status card. Reply with one JSON object with the single "
    "key value.\n"
    "- value: the block after your revision, in this form: {definition}. Copy the current text "
    "word for word and only insert the new keywords where they fit, stating each one as given. "
    "Do not elaborate on a keyword or add detail it does not contain. Adjust only the words "
    "next to an insertion so the sentence stays grammatically correct. Change nothing else: "
    "do not reword, shorten, reorder or remove the rest, and add no facts other than the new "
    "keywords.\n"
    "Never add or change a number; quote figures exactly as given. Never use anything from "
    "the excluded list, or its ideas."
)


_FOCUS_RULE = (
    "The card is about these topics only: {focus}. Use only notes that relate to them. Every "
    "sentence and every list item must be about a named topic: skip any item about another team "
    "or subject, even if the notes list it, unless it directly affects a named topic."
)


def focus_rule(focus: str) -> str:
    return _FOCUS_RULE.format(focus=focus) if focus else ""


MAX_TOKENS = {
    "title": 250,
    "status": 250,
    "summary": 350,
    "kpi": 450,
    "risks": 350,
    "next_steps": 350,
}


class BlockResult(BaseModel):
    value: Any


def parse_block_value(block: BlockField, text: str) -> Any:
    result = BlockResult.model_validate_json(text)
    return TypeAdapter(VALUE_TYPES[block]).validate_python(result.value)


def dump_value(block: BlockField, value: Any) -> Any:
    return TypeAdapter(VALUE_TYPES[block]).dump_python(value, mode="json")


def bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items) or "none"


def build_block_messages(
    block: BlockField,
    add: list[str],
    exclude: list[str],
    context: str,
    current: Any,
    focus: str = "",
) -> list[dict[str, str]]:
    system = _ENHANCE_SYSTEM.format(definition=DEFINITIONS[block])
    if focus:
        system += "\n" + focus_rule(focus)
    # the summary block's current text is the project summary, so it is not sent twice
    summary = "" if block == "summary" else f"Project summary:\n{context}\n\n"
    user = (
        f"{summary}"
        f"Current text:\n{json.dumps(current, ensure_ascii=False)}\n\n"
        f"New keywords to add:\n{bullets(add)}\n\n"
        f"Excluded, never use:\n{bullets(exclude)}"
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]
