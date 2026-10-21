import pytest

from app.generate.session import _SESSIONS, create_session, get_session, set_summary


def test_created_session_returns_its_source() -> None:
    session_id = create_session("notes text")

    assert get_session(session_id).source == "notes text"


def test_set_summary_is_returned_by_get_session() -> None:
    session_id = create_session("notes")

    set_summary(session_id, "short summary")

    assert get_session(session_id).summary == "short summary"


def test_unknown_session_raises_key_error() -> None:
    with pytest.raises(KeyError):
        get_session("missing")


WEEK = 7 * 24 * 60 * 60


def test_session_is_available_until_seven_days_after_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0)
    session_id = create_session("notes")

    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0 + WEEK)

    assert get_session(session_id).source == "notes"


def test_session_expires_after_seven_days(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0)
    session_id = create_session("notes")

    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0 + WEEK + 1)

    with pytest.raises(KeyError):
        get_session(session_id)


def test_summary_does_not_extend_the_lifetime(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0)
    session_id = create_session("notes")

    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0 + WEEK - 1)
    set_summary(session_id, "late summary")
    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0 + WEEK + 1)

    with pytest.raises(KeyError):
        get_session(session_id)


def test_creating_a_session_purges_expired_ones(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0)
    old_id = create_session("old")

    monkeypatch.setattr("app.generate.session._now", lambda: 1000.0 + WEEK + 1)
    create_session("new")

    assert old_id not in _SESSIONS


def test_focus_is_kept_with_the_session() -> None:
    assert get_session(create_session("notes", "network, security")).focus == "network, security"
    assert get_session(create_session("notes")).focus == ""
