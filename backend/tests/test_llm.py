from types import SimpleNamespace
from typing import Any

import pytest

from app.errors import UserError
from app.generate.llm import _client, get_chunk_streamer


class _FakeCompletions:
    def __init__(self) -> None:
        self.kwargs: dict[str, Any] = {}

    async def create(self, **kwargs: Any) -> Any:
        self.kwargs = kwargs

        async def chunks() -> Any:
            yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="hi"))])

        return chunks()


class _FakeClient:
    instances: list["_FakeClient"] = []

    def __init__(self, **kwargs: Any) -> None:
        self.init = kwargs
        self.chat = SimpleNamespace(completions=_FakeCompletions())
        _FakeClient.instances.append(self)


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> _FakeClient:
    _FakeClient.instances = []
    _client.cache_clear()
    monkeypatch.setattr("app.generate.llm.AsyncOpenAI", _FakeClient)
    monkeypatch.setenv("LLM_API_KEY", "key")
    monkeypatch.setenv("LLM_BASE_URL", "https://example.test/v1")
    monkeypatch.setenv("LLM_MODEL", "some-model")
    get_chunk_streamer()
    return _FakeClient.instances[0]


def test_missing_api_key_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LLM_API_KEY", raising=False)

    with pytest.raises(UserError, match="LLM_API_KEY is not set"):
        get_chunk_streamer()


@pytest.mark.usefixtures("client")
async def test_stream_passes_the_output_token_cap() -> None:
    stream = get_chunk_streamer()

    chunks = [c async for c in stream([{"role": "user", "content": "x"}], 123)]

    assert chunks == ["hi"]
    assert _FakeClient.instances[-1].chat.completions.kwargs["max_tokens"] == 123
