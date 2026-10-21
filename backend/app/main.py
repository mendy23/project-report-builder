from fastapi import FastAPI

from app.api import block, draft, generate, health

app = FastAPI(title="Snippet Cards", version="0.1.0")
app.include_router(health.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(block.router, prefix="/api")
app.include_router(draft.router, prefix="/api")
