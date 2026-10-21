import logging
from collections.abc import AsyncIterator
from typing import Any

import httpx2
import pytest
from openai import APIConnectionError, AuthenticationError, RateLimitError

from app.api.sse import event, failure, snapshots
from app.errors import UserError


def _fake(*chunks: str):  # type: ignore[no-untyped-def]
    async def stream(messages: list[dict[str, str]], max_tokens: int) -> AsyncIterator[str]:
        for chunk in chunks:
            yield chunk

    return stream


def test_event_formats_an_sse_block() -> None:
    assert event("done", {"a": 1}) == 'event: done\ndata: {"a": 1}\n\n'


async def test_snapshots_yield_distinct_partials_then_final() -> None:
    stream = _fake('{"a": "x', 'y"}')

    got: list[tuple[str, Any]] = [item async for item in snapshots(stream, [], 100)]

    assert got == [
        ("partial", {"a": "x"}),
        ("partial", {"a": "xy"}),
        ("final", '{"a": "xy"}'),
    ]


async def test_snapshots_skip_repeated_snapshots() -> None:
    stream = _fake('{"a": 1}', " ")

    got = [item async for item in snapshots(stream, [], 100)]

    assert got == [("partial", {"a": 1}), ("final", '{"a": 1} ')]


def _response(status: int) -> httpx2.Response:
    return httpx2.Response(status, request=httpx2.Request("POST", "http://provider/v1"))


def test_failure_shows_our_own_user_errors_as_they_are() -> None:
    assert failure(UserError("LLM_API_KEY is not set")) == "LLM_API_KEY is not set"


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (AuthenticationError("raw body", response=_response(401), body=None), "API key"),
        (RateLimitError("raw body", response=_response(429), body=None), "rate limiting"),
        (
            APIConnectionError(request=httpx2.Request("POST", "http://provider/v1")),
            "Could not reach",
        ),
    ],
)
def test_failure_explains_provider_errors_without_their_raw_text(
    error: Exception, expected: str
) -> None:
    message = failure(error)

    assert expected in message
    assert "raw body" not in message


def test_failure_logs_the_real_error_and_hides_it_from_the_user(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.ERROR):
        message = failure(RuntimeError("secret internal detail"))

    assert message == "The model request failed; see the server log for details"
    assert "secret internal detail" in caplog.text
