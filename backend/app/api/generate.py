from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel

from app.generate.rules import generate_rules
from app.generate.session import create_session
from app.models import Card, ChartSeries, Status
from app.parsers import parse_tabular_charts

router = APIRouter()


class GenerateResponse(BaseModel):
    card: Card
    charts: list[ChartSeries]
    pending: dict[str, str]
    session_id: str


class GenerateRequest(BaseModel):
    project_name: str = ""
    text: str = ""
    tables: list[str] = []
    focus: str = ""


@router.post("/generate", response_model=GenerateResponse)
def post_generate(request: GenerateRequest) -> GenerateResponse:
    charts = [c for table in request.tables for c in parse_tabular_charts(table)]
    blocks, pending = generate_rules(charts, project_name=request.project_name)

    card = Card(
        id=str(uuid4()),
        project_name=request.project_name,
        status=Status.ON_TRACK,
        blocks=blocks,
    )
    session_id = create_session("\n".join([request.text, *request.tables]), request.focus)
    return GenerateResponse(card=card, charts=charts, pending=pending, session_id=session_id)
