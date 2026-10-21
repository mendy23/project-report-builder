from collections.abc import AsyncIterator, Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import streamer_factory
from app.api.sse import event, failure, snapshots
from app.generate.block import dump_value
from app.generate.draft import build_draft_messages, draft_max_tokens, parse_draft
from app.generate.focus import select_focus_lines
from app.generate.llm import ChunkStreamer
from app.generate.session import get_session, set_summary
from app.generate.verify import verify_block
from app.models import BlockField

router = APIRouter()


class DraftRequest(BaseModel):
    session_id: str
    blocks: list[BlockField]
    exclude: dict[BlockField, list[str]] = {}


async def _events(
    request: DraftRequest, make_streamer: Callable[[], ChunkStreamer]
) -> AsyncIterator[str]:
    try:
        session = get_session(request.session_id)
    except KeyError:
        yield event("error", {"message": "This card's session expired; generate it again"})
        return

    try:
        notes = session.source
        if session.focus:
            notes = await select_focus_lines(make_streamer(), session.source, session.focus)
        messages = build_draft_messages(request.blocks, notes, request.exclude, session.focus)
        text = ""
        async for kind, payload in snapshots(
            make_streamer(), messages, draft_max_tokens(request.blocks)
        ):
            if kind == "partial":
                yield event("partial", payload)
            else:
                text = payload
    except Exception as exc:  # network, auth and rate-limit errors all end the stream here
        yield event("error", {"message": failure(exc)})
        return

    values, suggestions, failed = parse_draft(request.blocks, text)
    if "summary" in values:
        set_summary(request.session_id, values["summary"])
    done: dict[str, Any] = {
        "values": {},
        "suggestions": suggestions,
        "warnings": {},
        "failed": failed,
    }
    for block, value in values.items():
        done["values"][block] = dump_value(block, value)
        done["warnings"][block] = verify_block(block, value, session.source)
    yield event("done", done)


@router.post("/draft")
async def post_draft(
    request: DraftRequest,
    make_streamer: Annotated[Callable[[], ChunkStreamer], Depends(streamer_factory)],
) -> StreamingResponse:
    return StreamingResponse(_events(request, make_streamer), media_type="text/event-stream")
