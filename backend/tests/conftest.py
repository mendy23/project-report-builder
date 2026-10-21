from collections.abc import Callable, Iterator

import pytest

from app.api.deps import streamer_factory
from app.generate.llm import ChunkStreamer
from app.main import app


@pytest.fixture
def use_streamer() -> Iterator[Callable[[Callable[[], ChunkStreamer]], None]]:
    def install(make: Callable[[], ChunkStreamer]) -> None:
        app.dependency_overrides[streamer_factory] = lambda: make

    yield install
    app.dependency_overrides.clear()
