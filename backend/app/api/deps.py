from collections.abc import Callable

from app.generate.llm import ChunkStreamer, get_chunk_streamer


def streamer_factory() -> Callable[[], ChunkStreamer]:
    # a dependency that returns the factory, so a missing API key surfaces as an
    # SSE error event instead of a 500 before the stream opens
    return get_chunk_streamer
