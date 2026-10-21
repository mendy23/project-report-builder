from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient

from app.generate.block import MAX_TOKENS
from app.generate.session import create_session, get_session
from app.main import app
from tests.helpers import broken, fake, parse_events

NOTES = "Phase 2 finished a day early. Latency dropped 44%. Vendor contract is unsigned."
ANSWER = (
    '{"title": "Atlas", "summary": "Phase 2 finished early.", '
    '"risks": ["Vendor contract is unsigned"], "keywords": ["contract"]}'
)

client = TestClient(app)


def _events(**overrides: Any) -> list[tuple[str, Any]]:
    body = {
        "session_id": create_session(NOTES),
        "blocks": ["title", "summary", "risks"],
    } | overrides
    return parse_events(client.post("/api/draft", json=body).text)


def test_one_call_returns_every_block_with_suggestions_and_warnings(
    use_streamer: Callable[..., None],
) -> None:
    seen: list[list[dict[str, str]]] = []
    use_streamer(lambda: fake(ANSWER, seen=seen))

    name, data = _events()[-1]

    assert name == "done"
    assert len(seen) == 1
    assert data["values"]["risks"] == ["Vendor contract is unsigned"]
    assert data["suggestions"] == ["contract"]
    assert data["failed"] == {}
    assert data["warnings"]["summary"] == []


def test_partial_events_carry_the_fields_written_so_far(
    use_streamer: Callable[..., None],
) -> None:
    use_streamer(lambda: fake('{"title": "Atlas", ', '"summary": "Phase 2 finished early."}'))

    events = _events(blocks=["title", "summary"])

    partials = [data for name, data in events if name == "partial"]
    assert partials[0] == {"title": "Atlas"}
    assert partials[-1]["summary"] == "Phase 2 finished early."


def test_a_bad_field_is_reported_without_losing_the_others(
    use_streamer: Callable[..., None],
) -> None:
    use_streamer(lambda: fake('{"title": "Atlas", "status": "fine"}'))

    _, data = _events(blocks=["title", "status"])[-1]

    assert data["values"] == {"title": "Atlas"}
    assert list(data["failed"]) == ["status"]


def test_token_cap_covers_the_requested_blocks(use_streamer: Callable[..., None]) -> None:
    caps: list[int] = []
    use_streamer(lambda: fake(ANSWER, caps=caps))

    _events(blocks=["title", "summary"])

    assert caps == [(MAX_TOKENS["title"] + MAX_TOKENS["summary"]) * 3 // 2]


def test_the_summary_is_cached_for_later_rewrites(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake(ANSWER))
    session_id = create_session(NOTES)

    _events(session_id=session_id)

    assert get_session(session_id).summary == "Phase 2 finished early."


def test_unknown_session_ends_with_an_error(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake(ANSWER))

    name, data = _events(session_id="missing")[-1]

    assert name == "error"
    assert "expired" in data["message"]


def test_llm_errors_end_the_stream(use_streamer: Callable[..., None]) -> None:
    use_streamer(broken(RuntimeError("secret provider detail")))

    name, data = _events()[-1]

    assert name == "error"
    assert data["message"] == "The model request failed; see the server log for details"
    assert "secret" not in data["message"]


def test_typed_values_are_sent_as_plain_json(use_streamer: Callable[..., None]) -> None:
    use_streamer(
        lambda: fake('{"status": "at_risk", "kpi": [{"label": "Latency drop", "value": "44%"}]}')
    )

    _, data = _events(blocks=["status", "kpi"])[-1]

    assert data["values"] == {
        "status": "at_risk",
        "kpi": [{"label": "Latency drop", "value": "44%"}],
    }


def test_focus_filters_the_notes_before_the_draft_is_written(
    use_streamer: Callable[..., None],
) -> None:
    seen: list[list[dict[str, str]]] = []
    answers = iter(['{"lines": ["Latency dropped 44%."]}', ANSWER])
    use_streamer(lambda: fake(next(answers), seen=seen))

    name, _ = _events(session_id=create_session(NOTES, "network, security"))[-1]

    assert name == "done"
    assert "Topics: network, security" in seen[0][1]["content"]
    draft_system, draft_user = seen[1][0]["content"], seen[1][1]["content"]
    assert "these topics only: network, security" in draft_system
    assert "Latency dropped 44%." in draft_user
    assert "Vendor contract is unsigned" not in draft_user.split("Write these")[0]


def test_focus_matching_none_of_the_notes_is_reported(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake('{"lines": ["A line the notes never had."]}'))

    name, data = _events(session_id=create_session(NOTES, "payroll"))[-1]

    assert name == "error"
    assert "None of your notes relate to the focus: payroll" in data["message"]


def test_focus_reply_cut_off_at_the_cap_keeps_its_finished_lines(
    use_streamer: Callable[..., None],
) -> None:
    seen: list[list[dict[str, str]]] = []
    cut_off = '{"lines": ["Latency dropped 44%.", "Vendor contr'
    answers = iter([cut_off, ANSWER])
    use_streamer(lambda: fake(next(answers), seen=seen))

    name, _ = _events(session_id=create_session(NOTES, "network"))[-1]

    assert name == "done"
    notes_sent = seen[1][1]["content"].split("Write these")[0]
    assert "Latency dropped 44%." in notes_sent
    assert "Vendor contr" not in notes_sent


def test_focus_cap_grows_with_long_notes(use_streamer: Callable[..., None]) -> None:
    caps: list[int] = []
    answers = iter(['{"lines": ["Latency dropped 44%."]}', ANSWER])
    use_streamer(lambda: fake(next(answers), caps=caps))
    long_notes = NOTES + " Filler." * 2000

    _events(session_id=create_session(long_notes, "network"))

    assert caps[0] == len(long_notes) // 3


def test_focus_blank_lines_do_not_count_as_matches(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake('{"lines": ["", "  "]}'))

    name, data = _events(session_id=create_session(NOTES, "payroll"))[-1]

    assert name == "error"
    assert "None of your notes relate to the focus: payroll" in data["message"]
