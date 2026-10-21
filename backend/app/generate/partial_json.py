import json
from typing import Any


def _close(prefix: str) -> str:
    stack: list[str] = []
    in_string = escaped = False
    for ch in prefix:
        if in_string:
            escaped = ch == "\\" and not escaped
            in_string = in_string and (escaped or ch != '"')
        elif ch == '"':
            in_string = True
        elif ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]":
            stack.pop()
    body = prefix + ('"' if in_string else "")
    return body.rstrip().removesuffix(",") + "".join(reversed(stack))


def _commas_outside_strings(text: str) -> list[int]:
    positions: list[int] = []
    in_string = escaped = False
    for i, ch in enumerate(text):
        if in_string:
            escaped = ch == "\\" and not escaped
            in_string = in_string and (escaped or ch != '"')
        elif ch == '"':
            in_string = True
        elif ch == ",":
            positions.append(i)
    return positions


def parse_partial_json(text: str) -> dict[str, Any]:
    # a truncated stream can end mid-key or right after a colon; cut back to an
    # earlier comma until what is left closes into valid JSON
    for cut in [len(text), *reversed(_commas_outside_strings(text))]:
        try:
            parsed = json.loads(_close(text[:cut]))
        except (json.JSONDecodeError, IndexError):
            continue
        if isinstance(parsed, dict):
            return parsed
    return {}
