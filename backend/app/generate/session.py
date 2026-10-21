import time
from dataclasses import dataclass, field
from uuid import uuid4

TTL_SECONDS = 7 * 24 * 60 * 60

# a module-level function so tests can move the clock
_now = time.monotonic


@dataclass
class Session:
    source: str
    summary: str = ""
    focus: str = ""
    created: float = field(default_factory=lambda: _now())


_SESSIONS: dict[str, Session] = {}


def _expired(session: Session) -> bool:
    return _now() - session.created > TTL_SECONDS


def create_session(source: str, focus: str = "") -> str:
    # purging here keeps the cache from growing for as long as the server runs
    for session_id in [i for i, s in _SESSIONS.items() if _expired(s)]:
        del _SESSIONS[session_id]
    session_id = uuid4().hex
    _SESSIONS[session_id] = Session(source=source, focus=focus)
    return session_id


def set_summary(session_id: str, summary: str) -> None:
    _SESSIONS[session_id].summary = summary


def get_session(session_id: str) -> Session:
    session = _SESSIONS[session_id]
    if _expired(session):
        del _SESSIONS[session_id]
        raise KeyError(session_id)
    return session
