from app.generate.draft import build_draft_messages, parse_draft

NOTES = "Phase 2 finished a day early. Vendor contract is unsigned."


def test_prompt_defines_only_the_requested_blocks() -> None:
    system, user = build_draft_messages(["summary", "risks"], NOTES, {})
    system_text = system["content"]

    assert "summary:" in system_text and "risks:" in system_text
    assert "kpi:" not in system_text and "next_steps:" not in system_text
    assert NOTES in user["content"]


def test_blocks_are_asked_for_in_card_order() -> None:
    system, _ = build_draft_messages(["risks", "title", "summary"], NOTES, {})
    text = system["content"]

    assert text.index("title:") < text.index("summary:") < text.index("risks:")


def test_one_invalid_field_fails_only_its_block() -> None:
    text = '{"title": "Atlas", "status": "fine", "risks": ["Contract unsigned"]}'

    values, _, failed = parse_draft(["title", "status", "risks"], text)

    assert values == {"title": "Atlas", "risks": ["Contract unsigned"]}
    assert list(failed) == ["status"]
    assert "status" in failed["status"]


def test_suggestions_are_one_flat_list_of_strings() -> None:
    text = '{"title": "Atlas", "risks": [], "keywords": ["contract", 3, "latency"]}'

    _, suggestions, _ = parse_draft(["title", "risks"], text)

    assert suggestions == ["contract", "latency"]


def test_a_cut_off_keywords_list_costs_only_those_keywords() -> None:
    text = '{"title": "Atlas", "keywords": ["Atl'

    values, suggestions, failed = parse_draft(["title"], text)

    assert values == {"title": "Atlas"}
    assert suggestions == []
    assert failed == {}


def test_a_cut_off_reply_keeps_the_fields_that_finished() -> None:
    text = '{"title": "Atlas", "summary": "Phase 2 done.", "risks": ["Vendor contract", "Onbo'

    values, _, failed = parse_draft(["title", "summary", "risks"], text)

    assert values == {"title": "Atlas", "summary": "Phase 2 done."}
    assert list(failed) == ["risks"]


def test_a_missing_field_fails_its_block() -> None:
    values, _, failed = parse_draft(["title", "summary"], '{"title": "Atlas"}')

    assert values == {"title": "Atlas"}
    assert "summary" in failed


def test_text_that_is_not_json_fails_every_block() -> None:
    values, _, failed = parse_draft(["title", "summary"], "Sorry, I cannot do that")

    assert values == {}
    assert list(failed) == ["title", "summary"]


def test_each_blocks_excluded_items_are_listed_under_that_block_only() -> None:
    _, user = build_draft_messages(
        ["summary", "risks"], NOTES, {"risks": ["Vendor delay"], "summary": []}
    )

    assert "Excluded from risks, never use:\n- Vendor delay" in user["content"]
    assert "Excluded from summary" not in user["content"]


def test_focus_topics_are_named_in_the_prompt_only_when_given() -> None:
    focused, _ = build_draft_messages(["risks"], NOTES, {}, "network, security")
    plain, _ = build_draft_messages(["risks"], NOTES, {})

    assert "these topics only: network, security" in focused["content"]
    assert "these topics only" not in plain["content"]
