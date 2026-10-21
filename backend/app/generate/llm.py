import os
from collections.abc import AsyncIterator, Callable
from functools import cache

from openai import AsyncOpenAI

from app.errors import UserError

ChunkStreamer = Callable[[list[dict[str, str]], int], AsyncIterator[str]]


# one client per key and URL, so requests reuse its connection pool instead of opening new ones
@cache
def _client(api_key: str, base_url: str) -> AsyncOpenAI:
    # extra retries let a per-minute rate limit clear instead of failing the block
    return AsyncOpenAI(api_key=api_key, base_url=base_url, max_retries=5)


def get_chunk_streamer() -> ChunkStreamer:
    api_key = os.environ.get("LLM_API_KEY")
    if not api_key:
        raise UserError("LLM_API_KEY is not set")

    client = _client(api_key, os.environ["LLM_BASE_URL"])
    model = os.environ["LLM_MODEL"]
    # only some models accept this (Groq's qwen does, most OpenAI models reject it)
    effort = os.environ.get("LLM_REASONING_EFFORT")
    extra = {"reasoning_effort": effort} if effort else {}

    async def stream(messages: list[dict[str, str]], max_tokens: int) -> AsyncIterator[str]:
        response = await client.chat.completions.create(  # type: ignore[call-overload]
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            stream=True,
            **extra,
        )
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    return stream
