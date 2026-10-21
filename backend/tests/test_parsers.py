from app.models import ChartKind
from app.parsers import parse_tabular_charts


def test_csv_with_two_columns_detected_as_bar() -> None:
    raw = "team,velocity\nAlpha,32\nBravo,38\nCharlie,35\n"

    charts = parse_tabular_charts(raw)

    assert len(charts) == 1
    assert charts[0].kind == ChartKind.BAR
    assert charts[0].title == "Velocity"


def test_csv_with_sprint_labels_detected_as_line() -> None:
    raw = "sprint,velocity\nSprint 1,32\nSprint 2,38\nSprint 3,35\n"

    charts = parse_tabular_charts(raw)

    assert len(charts) == 1
    assert charts[0].kind == ChartKind.LINE


def test_csv_with_time_labels_detected_as_line() -> None:
    raw = "week,users\nWeek 1,120\nWeek 2,180\nWeek 3,250\n"

    charts = parse_tabular_charts(raw)

    assert len(charts) == 1
    assert charts[0].kind == ChartKind.LINE


def test_csv_with_multiple_numeric_columns_detected_as_line() -> None:
    raw = "month,signups,churn\nJan,100,5\nFeb,130,8\nMar,160,10\n"

    charts = parse_tabular_charts(raw)

    assert len(charts) == 2
    for chart in charts:
        assert chart.kind == ChartKind.LINE


def test_csv_with_two_columns_small_positive_detected_as_pie() -> None:
    raw = "category,budget\nEngineering,450\nDesign,120\nQA,80\n"

    charts = parse_tabular_charts(raw)

    assert len(charts) == 1
    assert charts[0].kind == ChartKind.PIE


def test_csv_pie_not_detected_when_values_include_zero() -> None:
    raw = "category,count\nA,10\nB,0\nC,5\n"

    charts = parse_tabular_charts(raw)

    assert charts[0].kind == ChartKind.BAR


def test_csv_with_a_text_column_before_the_numeric_one_is_charted() -> None:
    raw = "service,owner,progress_pct\nauth,Priya,100\nbilling,Mei,10\n"

    charts = parse_tabular_charts(raw)

    assert [(c.title, c.kind) for c in charts] == [("Progress Pct", ChartKind.BAR)]
