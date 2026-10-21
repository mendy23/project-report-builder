from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


class BlockType(StrEnum):
    HEADER = "header"
    STATUS = "status"
    SUMMARY = "summary"
    KPI = "kpi"
    CHART = "chart"
    IMAGE = "image"
    LIST = "list"
    NOTE = "note"


BlockField = Literal["title", "status", "summary", "kpi", "risks", "next_steps"]


class Status(StrEnum):
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    BLOCKED = "blocked"


class Block(BaseModel):
    id: str
    type: BlockType
    order: int
    data: dict[str, Any]


class Card(BaseModel):
    id: str
    project_name: str
    status: Status
    blocks: list[Block]
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Metric(BaseModel):
    label: str
    value: str


class ChartKind(StrEnum):
    BAR = "bar"
    LINE = "line"
    PIE = "pie"


class ChartPoint(BaseModel):
    label: str
    value: str


class ChartSeries(BaseModel):
    title: str
    points: list[ChartPoint]
    kind: ChartKind = ChartKind.BAR
