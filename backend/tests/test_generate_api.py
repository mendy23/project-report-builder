from typing import Any

from fastapi.testclient import TestClient

from app.generate.session import get_session
from app.main import app

client = TestClient(app)

NOTES = "Phase 2 of the Atlas migration finished a day early.\n- Vendor API contract is unsigned"


def _post(**payload: object) -> dict[str, Any]:
    response = client.post("/api/generate", json=payload)
    assert response.status_code == 200
    body: dict[str, Any] = response.json()
    return body


def _block_types(card: dict[str, Any]) -> list[str]:
    return [str(b["type"]) for b in card["blocks"]]


def test_response_has_card_charts_and_pending() -> None:
    assert set(_post(text=NOTES)) == {"card", "charts", "pending", "session_id"}


def test_notes_become_a_card() -> None:
    card = _post(project_name="Atlas Migration", text=NOTES)["card"]

    assert card["project_name"] == "Atlas Migration"
    assert _block_types(card)[:2] == ["header", "status"]


def test_the_project_name_reaches_the_header_block() -> None:
    card = _post(project_name="Atlas Migration", text=NOTES)["card"]

    header = next(b for b in card["blocks"] if b["type"] == "header")
    assert header["data"]["project_name"] == "Atlas Migration"


def test_response_maps_llm_fields_to_block_ids() -> None:
    body = _post(text=NOTES)

    ids = {b["id"] for b in body["card"]["blocks"]}
    assert set(body["pending"]) == {
        "title",
        "status",
        "summary",
        "kpi",
        "risks",
        "next_steps",
    }
    assert set(body["pending"].values()) <= ids


def test_kpi_block_starts_empty_even_when_notes_have_figures() -> None:
    card = _post(text="Latency dropped 44% after the rebuild.")["card"]

    kpi = next(b for b in card["blocks"] if b["type"] == "kpi")
    assert kpi["data"] == {"metrics": []}


def test_a_csv_becomes_a_chart_block_and_a_charts_entry() -> None:
    body = _post(text=NOTES, tables=["team,velocity\nAlpha,32\nBravo,38\n"])

    assert "chart" in _block_types(body["card"])
    assert [c["title"] for c in body["charts"]] == ["Velocity"]


def test_empty_input_still_returns_a_usable_card() -> None:
    card = _post()["card"]

    assert _block_types(card)[:3] == ["header", "status", "summary"]


def test_the_session_caches_the_notes_and_tables_joined() -> None:
    body = _post(text="notes", tables=["a,b\n1,2"])

    assert get_session(body["session_id"]).source == "notes\na,b\n1,2"


def test_focus_is_stored_in_the_session() -> None:
    session_id = _post(text=NOTES, focus="network")["session_id"]

    assert get_session(session_id).focus == "network"
