# Architecture

Two halves talking over `/api/*`:

- **backend/** — FastAPI + Pydantic. Parses CSVs into charts, builds the card skeleton, keeps
  the input in memory, and streams model-written block content back as server-sent events.
- **frontend/** — React 19 + Vite + Tailwind, state in Zustand. Input form, drag-and-drop
  editor, in-browser OCR, chart rendering (Recharts) and export.

In development Vite proxies `/api` to `http://127.0.0.1:8000`, so the browser only ever talks
to one origin. There is no database and no auth; everything the backend remembers lives in a
dict in one process.

## Request flow

1. The user fills the input screen. Screenshots are OCR'd in the browser and their text is
   added to the notes; images themselves never leave the browser.
2. `POST /api/generate` returns the card skeleton straight away: header, status, empty
   summary / KPI / risks / next steps placeholders, plus one chart block per numeric CSV
   column. It also returns a `pending` map (block field → placeholder block id) and a
   `session_id` under which the notes and CSV text are cached.
3. `POST /api/draft` writes every pending block in **one** streamed LLM call. Partial JSON is
   parsed as it arrives, so the blocks fill in while the model is still typing. The `done`
   event carries the final values, grounding warnings, suggested keywords and any block the
   model failed to write.
4. Later, the star on a block calls `POST /api/block` to rewrite that block with the keywords
   the user dragged in. A block whose first draft failed is still empty, so its star goes
   through `/api/draft` again instead.
5. Export happens entirely in the browser.

One call for the whole draft, rather than one per block, was a measured choice: it is about
twice as fast on a local model.

## API endpoints

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/api/health` | `{"status": "ok"}` |
| `POST` | `/api/generate` | JSON: `card`, `charts`, `pending`, `session_id` |
| `POST` | `/api/draft` | SSE: `partial`* then `done` (or `error`) |
| `POST` | `/api/block` | SSE: `partial`* then `done` (or `error`) |

Errors inside a stream, including a missing API key, arrive as an `error` event rather than an
HTTP status, because the stream has already opened with a 200. `api/deps.py` exists for this
reason: it hands the route a streamer *factory*, so building the client happens inside the
stream.

## Where the code lives

### Backend (`backend/app/`)

| Path | What it does |
| --- | --- |
| `main.py` | App and router wiring. |
| `api/generate.py` | `/api/generate`: parse CSVs, build the skeleton, open a session. |
| `api/draft.py` | `/api/draft`: optional focus filter, one streamed draft, verification. |
| `api/block.py` | `/api/block`: one-block rewrite with added and excluded keywords. |
| `api/sse.py` | SSE event formatting and the partial-JSON snapshot loop shared by both streams. |
| `api/deps.py` | Streamer factory dependency (see above). |
| `generate/rules.py` | The skeleton: blocks the rules fill exactly, placeholders for the rest. |
| `generate/block.py` | Per-block definitions, value types, token caps, the rewrite prompt. |
| `generate/draft.py` | The all-blocks draft prompt and parsing of a possibly cut-off reply. |
| `generate/focus.py` | Picks the note lines that match the focus topics. |
| `generate/verify.py` | Grounding check of model output against the input. |
| `generate/session.py` | In-memory session cache with a 7-day TTL. |
| `generate/llm.py` | OpenAI-compatible streaming client. |
| `generate/partial_json.py` | Best-effort parse of an unfinished JSON string. |
| `parsers/tabular.py` | CSV → chart series, with bar / line / pie detection. |
| `models/card.py` | Card, block and chart models; `BlockField` lists the model-written fields. |

### Frontend (`frontend/src/`)

See [frontend.md](frontend.md) for the per-area breakdown.
