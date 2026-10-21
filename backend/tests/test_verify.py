from app.generate.verify import verify_block
from app.models import Metric, Status

SOURCE = (
    "Phase 2 of the Atlas migration finished early. Latency dropped 44%. "
    "1,200 users moved. p95 latency 180 ms."
)


def test_invented_number_is_flagged() -> None:
    warnings = verify_block("summary", "Atlas migration latency fell 40%.", SOURCE)

    assert len(warnings) == 1
    assert "40" in warnings[0]


def test_number_formats_are_normalised() -> None:
    assert verify_block("summary", "1200 users moved in the Atlas migration.", SOURCE) == []


def test_grounded_summary_is_clean() -> None:
    summary = "Phase 2 of the Atlas migration finished early."

    assert verify_block("summary", summary, SOURCE) == []


def test_ungrounded_list_item_is_flagged() -> None:
    warnings = verify_block("risks", ["GDPR audit pending with outside counsel"], SOURCE)

    assert "GDPR audit pending" in warnings[0]


def test_cjk_grounded_summary_is_clean() -> None:
    assert verify_block("summary", "第二阶段提前完成。", "亚特兰蒂斯迁移第二阶段提前完成。") == []


def test_item_at_the_threshold_is_not_flagged() -> None:
    # two of four content words appear in the source: exactly 0.5
    assert verify_block("risks", ["Atlas migration budget approvals"], SOURCE) == []


def test_kpi_value_not_in_source_is_flagged() -> None:
    warnings = verify_block("kpi", [Metric(label="p95 latency", value="999 ms")], SOURCE)

    assert "999" in warnings[0]


def test_grounded_kpi_is_clean() -> None:
    assert verify_block("kpi", [Metric(label="p95 latency", value="180 ms")], SOURCE) == []


def test_title_is_checked() -> None:
    assert verify_block("title", "Quantum Reactor Overhaul", SOURCE) != []


def test_status_has_no_warnings() -> None:
    assert verify_block("status", Status.AT_RISK, SOURCE) == []


def test_decimals_do_not_split_a_summary_sentence() -> None:
    source = "Error rate fell to 0.3% after the Atlas migration."

    assert (
        verify_block("summary", "Error rate fell to 0.3% after the Atlas migration.", source) == []
    )


def test_csv_cells_are_separate_numbers() -> None:
    source = "sprint,velocity,bugs_closed\nSprint 1,24,9\nSprint 8,44,37\n"

    assert verify_block("kpi", [Metric(label="Sprint 1 velocity", value="24")], source) == []
