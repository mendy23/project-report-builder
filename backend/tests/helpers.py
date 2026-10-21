import json
from collections.abc import AsyncIterator, Callable
from typing import Any

from app.generate.llm import ChunkStreamer


def fake(
    *chunks: str,
    seen: list[list[dict[str, str]]] | None = None,
    caps: list[int] | None = None,
) -> ChunkStreamer:
    async def stream(messages: list[dict[str, str]], max_tokens: int) -> AsyncIterator[str]:
        if seen is not None:
            seen.append(messages)
        if caps is not None:
            caps.append(max_tokens)
        for chunk in chunks:
            yield chunk

    return stream


def broken(error: Exception) -> Callable[[], ChunkStreamer]:
    async def stream(messages: list[dict[str, str]], max_tokens: int) -> AsyncIterator[str]:
        raise error
        yield ""

    return lambda: stream


def parse_events(raw: str) -> list[tuple[str, Any]]:
    events = []
    for block in filter(None, raw.split("\n\n")):
        name, data = block.split("\n", 1)
        events.append((name.removeprefix("event: "), json.loads(data.removeprefix("data: "))))
    return events
