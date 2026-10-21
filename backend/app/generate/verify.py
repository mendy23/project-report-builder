import re
from collections.abc import Iterator
from typing import Any

from app.models import BlockField

GROUNDING_THRESHOLD = 0.5

_NUMBER = re.compile(r"\d+(?:\.\d+)?")
_WORD = re.compile(r"[a-z0-9]{3,}|[一-鿿]")
# a full stop inside a number such as 0.3 has no space after it, so it is not a sentence end
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+|(?<=。)\s*")
_STOP_WORDS = frozenset(
    "the and for with that this from are was were has have had its not but will into".split()
)
_LIST_BLOCKS = ("risks", "next_steps")


def _normalise(text: str) -> str:
    # "1,200" and "1200" are the same figure
    return re.sub(r"(?<=\d),(?=\d)", "", text.lower())


def _units(block: BlockField, value: Any) -> Iterator[str]:
    if block == "title":
        yield value
    elif block == "summary":
        for sentence in _SENTENCE_END.split(value):
            if sentence.strip():
                yield sentence.strip()
    elif block == "kpi":
        for metric in value:
            yield f"{metric.label} {metric.value}"
    elif block in _LIST_BLOCKS:
        yield from value


def verify_block(block: BlockField, value: Any, source: str) -> list[str]:
    source_text = _normalise(source)
    # a CSV row such as "Sprint 1,24,9" holds three numbers, but normalising reads them as 1249,
    # so the figures as written count too
    source_numbers = set(_NUMBER.findall(source_text)) | set(_NUMBER.findall(source.lower()))
    source_words = set(_WORD.findall(source_text))

    warnings: list[str] = []
    for unit in _units(block, value):
        text = _normalise(unit)
        for number in _NUMBER.findall(text):
            if number not in source_numbers:
                warnings.append(f'The number {number} in "{unit}" is not in your sources')
        words = [w for w in _WORD.findall(text) if w not in _STOP_WORDS]
        if words and sum(w in source_words for w in words) / len(words) < GROUNDING_THRESHOLD:
            warnings.append(f'"{unit}" may not come from your sources')
    return warnings
