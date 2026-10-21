# Frontend

Maintenance notes for the React app: how it is built, where the code lives, and the parts that
are easy to get wrong. Paths are relative to `frontend/src/`.

## What it is

Two screens, switched in `App.tsx` by whether a card exists in the store:

- **Input** (`screens/InputScreen.tsx`) — project name, focus, notes, dropped CSVs and
  screenshots. Screenshots are OCR'd here.
- **Edit** (`screens/EditScreen.tsx`) — the left palette (status tags, block types, parsed
  charts, uploaded images, keyword panel) and the card canvas.

All UI strings live in `i18n/en.json`; components read them through `react-i18next`.

## State

One Zustand store (`store/index.ts`) built from slices:

- **editor** — the card, the selected block, uploaded images, and a stack of removed blocks
  with their index so Undo can put them back where they were;
- **llm** (`store/llmSlice.ts`) — session id, the `pending` field → block id map, per-block
  run status, errors, warnings, and the fields whose draft came back empty;
- **keywords** (`store/keywords.ts`) — per field, `include`, `exclude` and `pending` (dragged
  in but not yet applied by a star). Its transitions are pure functions, so they are tested
  without React.

## LLM pipeline

`llm/run.ts` drives the backend streams and writes into the store:

- `runPipeline()` — one `/api/draft` call for every pending block.
- `enhanceBlock(field)` — the star: `/api/block` when the block has text, `/api/draft` for
  that one block when it is still empty.
- `addGenerated(field)` — adding a model-written block from the palette; it selects the
  existing block instead if the card already has one.

Every run gets its own `AbortController`. `abortLlm()` cancels all of them, and each run checks
`run.current()` before touching the store, so results from a run cancelled by Back or by a
newer run are dropped. During a rewrite the partials overwrite the block's text as they
arrive, so on failure the original value is put back.

`api.ts` reads the SSE stream by hand (`fetch` + `TextDecoderStream`) because `EventSource`
can't send a POST body.

## OCR

`ingest/ocr.ts` runs Tesseract.js in the browser. Before OCR it builds a second pass of the
image that keeps only near-white pixels with colour on both sides, because Tesseract skips
light text on coloured badges (status pills, roadmap bars). `ingest/group.ts` regroups the
recognised words into lines. Files over 10 MB are refused.

## Export

`export/copy.ts` copies the card to the clipboard in one of three formats:

| Format | Built by | Notes |
| --- | --- | --- |
| Rich text | `export/emailHtml.ts` | Email-safe HTML with inline styles from `export/tokens.ts`. Charts are rasterized to PNG data URLs by `export/chartRasterizer.tsx`. |
| PNG | `export/png.ts` | The email HTML rendered by `html-to-image`. |
| Plain text | `export/plainText.ts` | One text renderer per block type. |

## Where the code lives

| Path | What it does |
| --- | --- |
| `components/CardCanvas.tsx` | Canvas: drag-and-drop, drops from the palette, exclude box. |
| `components/CanvasBlock.tsx` | One block: handle, star, keyword chips, edit form, warnings. |
| `components/BlockContent.tsx` | Read-only render of each block type, incl. Recharts charts. |
| `components/EditableBlockContent.tsx` | Inline editing of each block type. |
| `components/BlockPalette.tsx` | Left panel: status tags, block types, charts, images. |
| `components/KeywordPanel.tsx` | Suggested and excluded keywords. |
| `components/ExcludeBox.tsx` | Floating drop target that cuts highlighted text into the exclude list. |
| `components/CopyMenu.tsx` | Export menu. |
| `llm/apply.ts` | Reads and writes a field's value on the card's blocks. |
| `store/blockDefaults.ts` | Default data for a block added from the palette. |
