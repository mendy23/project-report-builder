# Deploying to the cloud

## Recommendation

| Part | Recommended | Why |
| --- | --- | --- |
| Backend | **Google Cloud Run**, one container, `min-instances=1`, `max-instances=1` | Runs the existing FastAPI app as is, supports streamed responses, and pinning to one instance keeps the in-memory sessions working. `min=1` avoids cold starts dropping sessions between demos. |
| Frontend | **Firebase Hosting** serving `frontend/dist`, with a rewrite of `/api/**` to the Cloud Run service | Static build on a CDN, and the rewrite gives the same origin, so no code change and no CORS. |
| LLM | **A managed OpenAI-compatible API** (Groq, as in development, or OpenAI) | The client already speaks this format; deploying means setting three env vars. |
| Secrets | **Secret Manager**, mounted into Cloud Run as `LLM_API_KEY` | Keeps the key out of the image and the repo. |
| Access | **Identity-Aware Proxy** (or Cloud Run's "require authentication") in front of the service | Closes the "anyone can spend the key" gap without adding a login to the app. |
| Build | A `Dockerfile` for the backend (`uv sync` + `uvicorn app.main:app --host 0.0.0.0 --port $PORT`) and `npm run build` for the frontend, both from one CI job | There is no Dockerfile yet; it is the only new file the deployment needs. |

### Alternatives considered

- **One container serving both frontend and API** (FastAPI mounting `frontend/dist`). Fewer
  moving parts, but it needs a code change and loses the CDN. Fine if the hosting platform has
  no rewrite feature.
- **Self-hosted model (Ollama on a GPU VM).** Keeps notes off third-party providers, but a GPU
  instance running all day costs far more than API calls at demo volume. 
- **Serverless functions (Lambda, Vercel functions).** Request time limits and no shared memory
  between invocations break both the streams and the sessions.
