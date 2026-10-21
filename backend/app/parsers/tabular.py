import csv
import io

from app.models import ChartKind, ChartPoint, ChartSeries

_TIME_HINTS = (
    "q1 q2 q3 q4 20 jan feb mar apr may jun jul aug sep oct nov dec week day month sprint".split()
)
_COMPOSITION_HINTS = "budget allocation share distribution breakdown split portion".split()


def _is_numeric(value: str) -> bool:
    try:
        float(value)
    except ValueError:
        return False
    return True


def _detect_kind(header: list[str], numeric_cols: list[int], rows: list[list[str]]) -> ChartKind:
    labels = [row[0].strip().lower() for row in rows if row]
    if len(numeric_cols) >= 2 or any(hint in label for label in labels for hint in _TIME_HINTS):
        return ChartKind.LINE

    # two columns, so column 1 is the numeric one and float() cannot fail
    if len(header) == 2 and len(rows) <= 8:
        is_composition = any(hint in header[1].lower() for hint in _COMPOSITION_HINTS)
        if is_composition and all(float(row[1]) > 0 for row in rows):
            return ChartKind.PIE
    return ChartKind.BAR


def _readable(column: str) -> str:
    # "progress_pct" -> "Progress Pct"; the rest of each word is kept so "p95" stays "P95"
    return " ".join(w[:1].upper() + w[1:] for w in column.replace("_", " ").split())


def parse_tabular_charts(raw: str) -> list[ChartSeries]:
    """First column is the label; every fully numeric column after it is one series."""
    rows = [row for row in csv.reader(io.StringIO(raw)) if any(c.strip() for c in row)]
    if len(rows) < 2:
        return []

    header, data = [c.strip() for c in rows[0]], rows[1:]
    numeric_cols = [
        col
        for col in range(1, len(header))
        if all(col < len(row) and _is_numeric(row[col].strip()) for row in data)
    ]
    if not numeric_cols:
        return []

    kind = _detect_kind(header, numeric_cols, data)
    return [
        ChartSeries(
            title=_readable(header[col]),
            points=[ChartPoint(label=row[0].strip(), value=row[col].strip()) for row in data],
            kind=kind,
        )
        for col in numeric_cols
    ]
