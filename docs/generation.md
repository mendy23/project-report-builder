# Card generation

How the backend turns notes into block content. Everything model-facing lives in
`backend/app/generate/`.

## Rules first, model second

`rules.py` fills what it can exactly and leaves the rest to the model. The header (project
name, today's date), the default status and every chart come from rules; title (only when no
project name was given), status, summary, KPI, risks and next steps are placeholders. Charts
never go through the model, so their numbers can't drift.

CSV parsing (`parsers/tabular.py`) reads the first column as labels and every fully numeric
column after it as one series. The chart kind is guessed from the data:

- **line** if there are two or more numeric columns, or the labels look like time
  (`Q1`, `Jan`, `Sprint`, `2026`…);
- **pie** if there are exactly two columns, at most 8 rows, all values positive, and the
  value header sounds like a share (`budget`, `allocation`, `breakdown`…);
- **bar** otherwise.

## The model-written fields

`BlockField` in `models/card.py` lists them, and `block.py` holds three tables keyed by it:

- `DEFINITIONS` — one sentence per field that goes into the prompt;
- `VALUE_TYPES` — the Pydantic type the answer is validated against;
- `MAX_TOKENS` — the output cap per field.

Adding a field means adding it to all three, to `rules.py`, and to the frontend's field list.

## Draft (`/api/draft`)

`draft.py` builds one prompt that asks for a single JSON object with the requested blocks as
keys, in card order, plus a `keywords` list of up to 8 follow-up ideas the notes imply. The
token cap is the sum of the block caps × 1.5.

While the reply streams, `api/sse.py` re-parses the growing text with `parse_partial_json` and
emits a `partial` event whenever the snapshot changes. When the stream ends:

- If the full text isn't valid JSON, the reply was cut off and its last key may be unfinished,
  so that key is dropped.
- Each block is validated against its value type. A missing or malformed block goes into
  `failed` with its own message; the others still succeed.
- The summary value is stored on the session (see Rewrite below).

## Rewrite (`/api/block`)

The star sends the block's current value, the keywords to add and the excluded phrases. The
prompt is deliberately narrow: copy the current text word for word and only insert the new
keywords. Rewrites read the **session summary** as their context instead of the full notes,
which keeps them short and fast; the notes are the fallback when no summary was made.

## Focus

The input screen has an optional focus field ("only the payments team"). When it is set, the
draft first runs `focus.py`: a separate call that returns the note lines about those topics.
Only lines that appear verbatim in the notes are kept, so the model can't sneak in reworded or
invented lines. If none survive, the draft fails with "None of your notes relate to the focus".
The focus rule is also repeated in the draft and rewrite prompts.

A cut-off focus reply is still usable: every line before the last, unfinished one is kept.

## Verification

`verify.py` checks every block value against the original notes (not the focused subset) and
returns warnings that the editor shows on the block. A unit is a sentence, a list item, a KPI
or the title. Two checks:

- **Numbers** — every number in the unit must appear in the input. `1,200` and `1200` count as
  the same figure.
- **Words** — at least half of the unit's content words (3+ letters, stop words removed, CJK
  characters one by one) must appear in the input.

This checks that content is *grounded*, not that it is *true*: "not blocked" and "blocked"
share the same words and both pass. Treat a warning as "go look", and no warning as no
guarantee.

## Sessions

`session.py` keeps `{source, summary, focus}` per session in a module-level dict for 7 days.
Expired sessions are purged when a new one is created, so the dict doesn't grow forever. A
backend restart loses every session; the frontend then gets "This card's session expired;
generate it again" on the next star.

## The parts that are easy to get wrong

- **Prompts and tests move together.** The prompt strings are asserted on in
  `backend/tests/`; rewording a prompt usually means updating a test.
- **`response_format=json_object`** is sent on every call. A provider or local model that
  ignores it will still mostly work, because parsing is lenient, but expect more `failed`
  blocks.
- **`LLM_REASONING_EFFORT=none`** matters for qwen models: without it they spend the output
  cap on hidden thinking and the reply comes back cut off.
