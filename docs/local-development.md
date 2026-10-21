# Local development

Setup and run commands are in the [project README](../README.md). This page covers
configuration and the checks to run before handing a change over.

## Configuration

The backend reads four environment variables, loaded with `--env-file`:

| Variable | What it controls |
| --- | --- |
| `LLM_API_KEY` | Provider key. Required; Ollama ignores it but the client needs a non-empty one. |
| `LLM_BASE_URL` | Any OpenAI-compatible endpoint (Groq, OpenAI, Ollama, a LiteLLM proxy). |
| `LLM_MODEL` | The model name at that endpoint. |
| `LLM_REASONING_EFFORT` | Optional. `none` for qwen models; leave it out for OpenAI models, which reject it. |

`.env.example` at the repo root is the only template; copy it to `backend/.env`. It holds
three setups, and exactly one should be uncommented:

1. A cloud model in the OpenAI format: Groq (active), with OpenAI and Gemini examples.
2. Ollama with `qwen3:4b`: no key, no rate limit, works offline. It also sets `NO_PROXY` so a
   system proxy doesn't intercept `localhost`.
3. A LiteLLM proxy for providers that don't speak the OpenAI format.

Switch setups by editing `backend/.env` and restarting uvicorn. The client is cached per key
and URL, so the restart is needed.

**Privacy:** with a cloud model, the notes, CSV text and OCR text are sent to that provider.
Use the local setup for anything sensitive.

## Checks

Backend, from `backend/`:

```bash
uv run pytest
```

```bash
uv run ruff check . && uv run ruff format --check .
```

```bash
uv run mypy app
```

Frontend, from `frontend/`:

```bash
npm test
```

```bash
npm run lint && npm run typecheck && npm run format:check
```

Backend tests replace the LLM with a fake streamer through the `streamer_factory` dependency,
so they need no key and no network. Frontend tests run in jsdom (Vitest + Testing Library).

## Trying a change by hand

Paste one of the `mock-data/atlas/*.txt` files as notes and drop a CSV from the same folder.
`notes-no-numbers.txt` and `notes-short.txt` are useful edge cases (empty KPI block, very
little to write). The screenshots exercise OCR, including the coloured-badge pass.
