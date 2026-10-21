from datetime import date
from typing import Any
from uuid import uuid4

from app.models import Block, BlockType, ChartSeries

_LIST_FIELDS = (("risks", "Risks"), ("next_steps", "Next steps"))


def generate_rules(
    charts: list[ChartSeries], project_name: str = ""
) -> tuple[list[Block], dict[str, str]]:
    """Blocks the rules can fill exactly, plus empty placeholders for the LLM fields.

    The second value maps each LLM field to its placeholder block id.
    """
    pending_fields: dict[str, int] = {}
    entries: list[tuple[BlockType, dict[str, Any]]] = []

    def add(block_type: BlockType, data: dict[str, Any], field: str | None = None) -> None:
        if field:
            pending_fields[field] = len(entries)
        entries.append((block_type, data))

    header = {"project_name": project_name, "update_date": date.today().isoformat(), "author": ""}
    add(BlockType.HEADER, header, None if project_name else "title")
    add(BlockType.STATUS, {"label": "On track", "tone": "on_track"}, "status")
    add(BlockType.SUMMARY, {"text": ""}, "summary")

    add(BlockType.KPI, {"metrics": []}, "kpi")

    for field, title in _LIST_FIELDS:
        add(BlockType.LIST, {"title": title, "items": []}, field)

    for chart in charts:
        points = [{"label": p.label, "value": p.value} for p in chart.points]
        add(BlockType.CHART, {"title": chart.title, "points": points, "kind": chart.kind.value})

    blocks = [Block(id=str(uuid4()), type=t, order=i, data=d) for i, (t, d) in enumerate(entries)]
    return blocks, {field: blocks[i].id for field, i in pending_fields.items()}
