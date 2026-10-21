from app.generate.partial_json import parse_partial_json


def test_open_string_is_kept() -> None:
    assert parse_partial_json('{"summary": "Phase 2 fin') == {"summary": "Phase 2 fin"}


def test_open_list_keeps_complete_items() -> None:
    assert parse_partial_json('{"risks": ["a", "b') == {"risks": ["a", "b"]}


def test_dangling_key_is_dropped() -> None:
    assert parse_partial_json('{"summary": "x", "ris') == {"summary": "x"}


def test_key_without_value_is_dropped() -> None:
    assert parse_partial_json('{"summary": "x", "risks": ') == {"summary": "x"}


def test_complete_json_round_trips() -> None:
    text = '{"title": "Atlas", "risks": ["a"], "summary": "done \\"early\\""}'

    assert parse_partial_json(text) == {"title": "Atlas", "risks": ["a"], "summary": 'done "early"'}


def test_empty_input_gives_empty_dict() -> None:
    assert parse_partial_json("") == {}
