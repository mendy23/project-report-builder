from app.generate.rules import generate_rules
from app.models import BlockType, ChartKind, ChartPoint, ChartSeries


def test_kpi_is_an_empty_placeholder_registered_in_pending() -> None:
    blocks, pending = generate_rules([])

    kpi = next(b for b in blocks if b.type == BlockType.KPI)
    assert kpi.data == {"metrics": []}
    assert pending["kpi"] == kpi.id


def test_llm_blocks_are_empty_placeholders() -> None:
    blocks, _ = generate_rules([])

    summary = next(b for b in blocks if b.type == BlockType.SUMMARY)
    lists = {b.data["title"]: b.data["items"] for b in blocks if b.type == BlockType.LIST}
    assert summary.data == {"text": ""}
    assert lists == {"Risks": [], "Next steps": []}


def test_pending_maps_each_field_to_its_block_id() -> None:
    blocks, pending = generate_rules([], project_name="")

    by_id = {b.id: b for b in blocks}
    assert set(pending) == {
        "title",
        "status",
        "summary",
        "kpi",
        "risks",
        "next_steps",
    }
    assert by_id[pending["summary"]].type == BlockType.SUMMARY
    assert by_id[pending["status"]].type == BlockType.STATUS
    assert by_id[pending["title"]].type == BlockType.HEADER
    assert by_id[pending["risks"]].data["title"] == "Risks"


def test_typed_project_name_has_no_title_pending() -> None:
    blocks, pending = generate_rules([], project_name="Atlas")

    header = next(b for b in blocks if b.type == BlockType.HEADER)
    assert header.data["project_name"] == "Atlas"
    assert "title" not in pending


def test_blocks_are_ordered_from_zero_without_gaps() -> None:
    blocks, _ = generate_rules([])

    assert [b.order for b in blocks] == list(range(len(blocks)))


def test_block_order_is_header_status_summary_kpi_lists_then_charts() -> None:
    chart = ChartSeries(title="Revenue", points=[ChartPoint(label="Q1", value="120")])

    blocks, _ = generate_rules([chart])

    assert [b.type for b in blocks] == [
        BlockType.HEADER,
        BlockType.STATUS,
        BlockType.SUMMARY,
        BlockType.KPI,
        BlockType.LIST,
        BlockType.LIST,
        BlockType.CHART,
    ]


def test_chart_series_kind_passes_through_to_block() -> None:
    chart = ChartSeries(
        title="Revenue", points=[ChartPoint(label="Q1", value="120")], kind=ChartKind.LINE
    )

    blocks, _ = generate_rules([chart])

    chart_block = next(b for b in blocks if b.type == BlockType.CHART)
    assert chart_block.data["kind"] == "line"
