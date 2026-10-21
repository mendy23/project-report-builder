from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.generate.session import create_session, get_session, set_summary
from app.main import app
from tests.helpers import broken, fake, parse_events

NOTES = "Phase 2 finished a day early. Latency dropped 44%. Vendor contract is unsigned."
SUMMARY = "Atlas phase 2 finished early; vendor contract unsigned."
ANSWER = '{"value": "Atlas phase 2 finished early."}'

client = TestClient(app)


def _session(summary: str | None = SUMMARY) -> str:
    session_id = create_session(NOTES)
    if summary:
        set_summary(session_id, summary)
    return session_id


def _events(**overrides: Any) -> list[tuple[str, Any]]:
    body = {
        "session_id": _session(),
        "block": "summary",
        "add": [],
        "exclude": [],
        "current": "Text.",
    } | overrides
    return parse_events(client.post("/api/block", json=body).text)


def test_enhance_prompt_keeps_the_current_text_and_adds_only_the_new_keywords(
    use_streamer: Callable[..., None],
) -> None:
    seen: list[list[dict[str, str]]] = []
    use_streamer(lambda: fake(ANSWER, seen=seen))

    _events(
        current="Phase 2 finished early.",
        add=["Latency dropped 44%"],
        exclude=["rollout delays"],
    )

    user = seen[0][1]["content"]
    assert "Phase 2 finished early." in user
    assert "Latency dropped 44%" in user
    assert "rollout delays" in user
    assert SUMMARY not in user
    assert NOTES not in user


def test_enhance_sends_a_list_block_as_json(use_streamer: Callable[..., None]) -> None:
    seen: list[list[dict[str, str]]] = []
    use_streamer(lambda: fake('{"value": ["Vendor late"]}', seen=seen))

    _events(block="risks", current=["Vendor late"], add=["budget"])

    assert '["Vendor late"]' in seen[0][1]["content"]


def test_enhance_without_a_cached_summary_falls_back_to_the_notes(
    use_streamer: Callable[..., None],
) -> None:
    seen: list[list[dict[str, str]]] = []
    use_streamer(lambda: fake(ANSWER, seen=seen))

    _events(
        session_id=_session(summary=None),
        block="risks",
        current=["Text."],
        add=["x"],
    )

    assert NOTES in seen[0][1]["content"]


def test_rewriting_the_summary_block_updates_the_cached_summary(
    use_streamer: Callable[..., None],
) -> None:
    use_streamer(lambda: fake('{"value": "Revised summary."}'))
    session_id = _session()

    _events(session_id=session_id, current="Old.", add=["x"])

    assert get_session(session_id).summary == "Revised summary."


def test_other_blocks_leave_the_cached_summary_alone(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake('{"value": ["Vendor late"]}'))
    session_id = _session()

    _events(session_id=session_id, block="risks")

    assert get_session(session_id).summary == SUMMARY


@pytest.mark.parametrize(
    ("block", "answer", "value"),
    [
        ("title", '{"value": "Atlas"}', "Atlas"),
        ("status", '{"value": "at_risk"}', "at_risk"),
        (
            "summary",
            '{"value": "Phase 2 finished early."}',
            "Phase 2 finished early.",
        ),
        (
            "kpi",
            '{"value": [{"label": "Latency drop", "value": "44%"}]}',
            [{"label": "Latency drop", "value": "44%"}],
        ),
        (
            "risks",
            '{"value": ["Vendor contract unsigned"]}',
            ["Vendor contract unsigned"],
        ),
        ("next_steps", '{"value": []}', []),
    ],
)
def test_each_block_shape_validates(
    use_streamer: Callable[..., None], block: str, answer: str, value: Any
) -> None:
    use_streamer(lambda: fake(answer))

    name, data = _events(block=block)[-1]

    assert name == "done"
    assert data["value"] == value


def test_unknown_session_gives_regenerate_error(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake(ANSWER))

    name, data = _events(session_id="missing")[-1]

    assert name == "error"
    assert "generate" in data["message"]


def test_done_carries_verify_warnings(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake('{"value": "Latency fell 99% in the Atlas phase."}'))

    _, data = _events()[-1]

    assert "99" in data["warnings"][0]


def test_kpi_with_an_invented_value_warns(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake('{"value": [{"label": "Latency drop", "value": "77%"}]}'))

    _, data = _events(block="kpi")[-1]

    assert "77" in data["warnings"][0]


def test_partial_events_stream_the_value(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake(ANSWER[:20], ANSWER[20:]))

    events = _events()

    assert [name for name, _ in events[:-1]] == ["partial"] * (len(events) - 1)
    assert events[0][1]["value"].startswith("Atlas")


def test_invalid_json_gives_error_event(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake('{"value": "Atl'))

    name, data = _events()[-1]

    assert name == "error"
    assert "malformed" in data["message"]


def test_wrong_value_type_gives_error_event(use_streamer: Callable[..., None]) -> None:
    use_streamer(lambda: fake('{"value": "nope"}'))

    name, data = _events(block="status")[-1]

    assert name == "error"
    assert "malformed" in data["message"]


def test_missing_key_gives_error_event(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LLM_API_KEY", raising=False)

    assert _events()[-1] == ("error", {"message": "LLM_API_KEY is not set"})


def test_streamer_failure_gives_error_event(use_streamer: Callable[..., None]) -> None:
    use_streamer(broken(ConnectionError("provider unreachable")))

    assert _events()[-1] == (
        "error",
        {"message": "The model request failed; see the server log for details"},
    )


@pytest.mark.parametrize(
    ("block", "cap"),
    [
        ("title", 250),
        ("status", 250),
        ("summary", 350),
        ("kpi", 450),
        ("risks", 350),
        ("next_steps", 350),
    ],
)
def test_each_block_has_its_own_output_token_cap(
    use_streamer: Callable[..., None], block: str, cap: int
) -> None:
    caps: list[int] = []
    use_streamer(lambda: fake('{"value": ""}', caps=caps))

    _events(block=block)

    assert caps == [cap]


def test_content_added_by_a_keyword_that_the_notes_lack_is_flagged(
    use_streamer: Callable[..., None],
) -> None:
    use_streamer(
        lambda: fake(
            '{"value": "Atlas phase 2 finished early. The team is recruiting four engineers."}'
        )
    )

    _, data = _events(current="Atlas phase 2 finished early.", add=["recruiting"])[-1]

    assert any("recruiting four engineers" in w for w in data["warnings"])


def test_other_blocks_still_get_the_project_summary_for_context(
    use_streamer: Callable[..., None],
) -> None:
    seen: list[list[dict[str, str]]] = []
    use_streamer(lambda: fake('{"value": ["Vendor late"]}', seen=seen))

    _events(block="risks", current=["Vendor late"], add=["budget"])

    assert SUMMARY in seen[0][1]["content"]


def test_focus_set_when_generating_reaches_the_rewrite_prompt(
    use_streamer: Callable[..., None],
) -> None:
    seen: list[list[dict[str, str]]] = []
    use_streamer(lambda: fake(ANSWER, seen=seen))

    _events(session_id=create_session(NOTES, "network"))

    assert "these topics only: network" in seen[0][0]["content"]
