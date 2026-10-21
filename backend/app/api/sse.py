import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from openai import APIConnectionError, AuthenticationError, PermissionDeniedError, RateLimitError
from pydantic import ValidationError

from app.errors import UserError
from app.generate.llm import ChunkStreamer
from app.generate.partial_json import parse_partial_json

logger = logging.getLogger(__name__)


def event(name: str, data: dict[str, Any]) -> str:
    return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def snapshots(
    stream: ChunkStreamer, messages: list[dict[str, str]], max_tokens: int
) -> AsyncIterator[tuple[str, Any]]:
    text = ""
    last: dict[str, Any] = {}
    async for chunk in stream(messages, max_tokens):
        text += chunk
        snapshot = parse_partial_json(text)
        if snapshot != last:
            last = snapshot
            yield "partial", snapshot
    yield "final", text


def malformed(exc: ValidationError) -> str:
    first = exc.errors()[0]
    where = ".".join(str(part) for part in first["loc"])
    return f"The model's answer was malformed at {where}: {first['msg']}"


def failure(exc: Exception) -> str:
    """The message to show for a failed model call; the real error goes to the server log."""
    if isinstance(exc, UserError):
        return str(exc)
    # provider errors can carry raw response bodies, so only a short explanation is shown
    logger.error("model call failed", exc_info=exc)
    if isinstance(exc, AuthenticationError | PermissionDeniedError):
        return "The model provider rejected the API key; check LLM_API_KEY"
    if isinstance(exc, RateLimitError):
        return "The model provider is rate limiting requests; wait a moment and try again"
    if isinstance(exc, APIConnectionError):
        return "Could not reach the model provider; check your connection and LLM_BASE_URL"
    return "The model request failed; see the server log for details"
