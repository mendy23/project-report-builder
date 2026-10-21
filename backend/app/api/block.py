from collections.abc import AsyncIterator, Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ValidationError

from app.api.deps import streamer_factory
from app.api.sse import event, failure, malformed, snapshots
from app.generate.block import (
    MAX_TOKENS,
    build_block_messages,
    dump_value,
    parse_block_value,
)
from app.generate.llm import ChunkStreamer
from app.generate.session import get_session, set_summary
from app.generate.verify import verify_block
from app.models import BlockField

router = APIRouter()


class BlockRequest(BaseModel):
    session_id: str
    block: BlockField
    add: list[str] = []
    exclude: list[str] = []
    current: Any


async def _events(
    request: BlockRequest, make_streamer: Callable[[], ChunkStreamer]
) -> AsyncIterator[str]:
    try:
        session = get_session(request.session_id)
    except KeyError:
        yield event("error", {"message": "This card's session expired; generate it again"})
        return

    # a rewrite reads the short summary; the notes are the fallback if it was never made
    context = session.summary or session.source
    messages = build_block_messages(
        request.block, request.add, request.exclude, context, request.current, session.focus
    )
    try:
        stream = make_streamer()
        text = ""
        async for kind, payload in snapshots(stream, messages, MAX_TOKENS[request.block]):
            if kind == "partial":
                yield event("partial", payload)
            else:
                text = payload
        value = parse_block_value(request.block, text)
    except ValidationError as exc:
        yield event("error", {"message": malformed(exc)})
        return
    except Exception as exc:  # network, auth and rate-limit errors all end the stream here
        yield event("error", {"message": failure(exc)})
        return

    if request.block == "summary":
        # the summary block doubles as the project summary that later rewrites read
        set_summary(request.session_id, value)
    yield event(
        "done",
        {
            "value": dump_value(request.block, value),
            "warnings": verify_block(request.block, value, session.source),
        },
    )


@router.post("/block")
async def post_block(
    request: BlockRequest,
    make_streamer: Annotated[Callable[[], ChunkStreamer], Depends(streamer_factory)],
) -> StreamingResponse:
    return StreamingResponse(_events(request, make_streamer), media_type="text/event-stream")
