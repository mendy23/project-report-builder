# Project Report Builder

Turn loose notes, CSV files, and screenshots into a structured, copy-pasteable
project status card. Paste it into an email, Slack, or a wiki as rich text,
an image, or plain text.

## Architecture

```
project-report-builder/
├── backend/    FastAPI + Pydantic — parses notes/CSV, generates card blocks
├── frontend/   React + Vite + Tailwind — editor, chart rendering, export
└── docs/       Architecture, generation, frontend, development and deployment notes
```

The frontend talks to the backend over `/api/*`. In development, Vite proxies
`/api` to `http://127.0.0.1:8000`.

### What the backend does

- Builds the card skeleton at once: empty placeholders for the title, status, summary, KPI,
  risks and next steps, plus chart blocks parsed from any CSV (bar / line / pie, auto-detected).
- Keeps the notes and CSV text in memory under a session id for up to 7 days.
- Writes each block with its own streamed call to an OpenAI-compatible LLM (Groq by default): the
  first draft reads the notes and also returns suggested keywords. A rewrite (the star) takes the
  block's current text plus the keywords you dragged in, keeps the text and adds the new
  information. The summary block's text is kept as the short project summary that rewrites read.
  Every answer is checked against your notes.

### What the frontend does

- **Input screen** — paste notes, drop CSV files or screenshots. Images are
  OCR'd in-browser via Tesseract.js (images are never uploaded; the extracted text is sent to the model, see below).
- **Editor** — drag-and-drop blocks onto a card, reorder with the handle, click to
  edit inline, hover to delete. Status tags, parsed charts, and uploaded images
  appear in the left palette as draggable options.
- **Keywords** — each model-written block keeps include and exclude lists. Suggested keywords sit in
  the left panel; drag one into its block, then press the star to rewrite the block with it. Highlight
  text in a block and drag it to the floating "Exclude" box to cut it and keep it out of rewrites.
- **Charts** — rendered as real bar/line/pie charts via Recharts. When exporting
  to HTML or PNG, charts are rasterized to PNG data URLs and embedded inline.
- **Export** — copy as rich text (email-safe HTML), PNG image, or plain text.

## Prerequisites

- **Python 3.12+** (with [`uv`](https://docs.astral.sh/uv/) for dependency management)
- **Node.js 20+** (with npm)
- An LLM API key, e.g. from console.groq.com (copy `.env.example` to `backend/.env`). OCR runs client-side via WASM.
- **Privacy:** notes, CSV text and OCR text are sent to the LLM provider (Groq by default) to write the card.
- **Verification:** every number in the model output must appear in your input, and each sentence
  or list item must share enough words with it; failures get a warning on the block. This checks
  that content is grounded in your input, not that it is true: "not blocked" vs "blocked" passes.

## Setup

### 1. Backend

```bash
cd backend
uv sync
source .venv/bin/activate
```

### 2. Frontend

```bash
cd frontend
npm install
```

## Running the app

You need **both** servers running in separate terminals.

### Terminal 1 — backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --env-file .env
```

### Cloud or local model

The card is written by an OpenAI-compatible model, set in `backend/.env` (copied from
`.env.example`).

- **Cloud (default).** Add your API key to the active setup and start the backend with
  `--env-file .env`. This is how to try the app with your own key.
- **Local, for development and demos.** No key, no rate limits, works offline.
  ```bash
  brew install ollama          # or the app from ollama.com
  ollama pull qwen3:4b
  ollama serve                 # skip if the Ollama app is already running; leave it open
  ```
  In `backend/.env`, comment out setup 1 and uncomment setup 2, then restart the backend.

`LLM_REASONING_EFFORT` is optional; set it to `none` for Groq's qwen models and for local qwen3, 
and leave it out for most OpenAI models, which reject the parameter.

The API is now available at `http://127.0.0.1:8000`.
Check it's alive: `curl http://127.0.0.1:8000/api/health` → `{"status":"ok"}`

### Terminal 2 — frontend

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Usage

1. **Add inputs** — enter a project name, paste notes into the text area, and/or
   drop CSV files or screenshots. Screenshots are OCR'd in-browser.
2. **Generate** — click "Generate card". The card skeleton appears at once, then every block
   fills in as its draft streams.
3. **Edit** — drag blocks from the left palette onto the card. Drag a block's handle to
   reorder. Click a block to edit it inline. Hover and click × to delete.
   Drag status tags onto the card to set the project status. Drag suggested keywords into a
   block and press its star to rewrite it; drag highlighted text to the Exclude box to remove it.
4. **Export** — click "Rich text" to copy email-safe HTML (with embedded chart
   PNGs and images), "Image" to copy a PNG, or "Plain text" for a text-only
   version. Click "Download PNG" to save a PNG file.

## Pre-push hook

A git pre-push hook runs the same checks as CI **before** a push is allowed
through. If any check fails, the push is blocked so you can fix it locally
instead of waiting for GitHub Actions.

Git hooks aren't committed to the repo, so after a fresh clone you need to
create the hook file:

```bash
cat > .git/hooks/pre-push << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"

echo "━━━ pre-push: running local CI checks ━━━"

echo "▶ backend: ruff check"
(cd "$REPO_ROOT/backend" && uv run ruff check .)
echo "▶ backend: ruff format --check"
(cd "$REPO_ROOT/backend" && uv run ruff format --check .)
echo "▶ backend: mypy"
(cd "$REPO_ROOT/backend" && uv run mypy)
echo "▶ backend: pytest"
(cd "$REPO_ROOT/backend" && uv run pytest -q)

echo "▶ frontend: lint (eslint)"
(cd "$REPO_ROOT/frontend" && npm run lint)
echo "▶ frontend: format:check (prettier)"
(cd "$REPO_ROOT/frontend" && npm run format:check)
echo "▶ frontend: typecheck (tsc)"
(cd "$REPO_ROOT/frontend" && npm run typecheck)
echo "▶ frontend: test (vitest)"
(cd "$REPO_ROOT/frontend" && npm test)

echo "━━━ pre-push: all checks passed ✓ ━━━"
EOF
chmod +x .git/hooks/pre-push
```

To bypass the hook in an emergency: `git push --no-verify`.

## Testing

### Backend

```bash
cd backend
source .venv/bin/activate
pytest                    
ruff check app tests     
mypy app tests            
```

### Frontend

```bash
cd frontend
npm run test              
npm run typecheck        
npm run lint              
npm run format            
```

## Key files

| Path | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app entry point |
| `backend/app/parsers/tabular.py` | Parses CSV into chart series (with kind detection) |
| `backend/app/generate/rules.py` | Builds the card skeleton: placeholders plus chart blocks |
| `backend/app/generate/block.py` | Per-block prompt and output validation |
| `backend/app/generate/session.py` | In-memory cache of the input and project summary |
| `backend/app/generate/verify.py` | Checks block output against your notes |
| `backend/app/api/draft.py` | `/api/draft` streaming endpoint (writes one or more blocks in one call: the first draft, or a retry of a block that failed) |
| `backend/app/api/block.py` | `/api/block` streaming endpoint (rewrites one block with the keywords you added) |
| `frontend/src/screens/InputScreen.tsx` | Input form (notes, files, OCR) |
| `frontend/src/screens/EditScreen.tsx` | Editor screen (palette + canvas) |
| `frontend/src/components/BlockPalette.tsx` | Left panel — status tags, block types, parsed charts, images |
| `frontend/src/components/CardCanvas.tsx` | Card canvas — drag-and-drop, drops, exclude box |
| `frontend/src/components/CanvasBlock.tsx` | One block: handle, star, chips, edit form |
| `frontend/src/components/KeywordPanel.tsx` | Left panel — suggested and excluded keywords |
| `frontend/src/store/keywords.ts` | Pure include/exclude list transitions |
| `frontend/src/llm/run.ts` | Pipeline: one draft request for all blocks, star rewrite |
| `frontend/src/components/BlockContent.tsx` | Renders each block type (incl. recharts bar/line/pie) |
| `frontend/src/export/emailHtml.ts` | Renders card to email-safe HTML (charts rasterized to PNG) |
| `frontend/src/export/chartRasterizer.tsx` | Off-screen recharts render → PNG data URL |
| `frontend/src/export/png.ts` | Renders card to a PNG blob |
| `frontend/src/export/plainText.ts` | Renders card to plain text |

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/generate` | Return the card skeleton, parsed charts, the placeholder map and a `session_id` |
| `POST` | `/api/draft` | Stream the first draft of every pending block in one call |
| `POST` | `/api/block` | Stream one block's content (`draft` or `enhance` mode) |
