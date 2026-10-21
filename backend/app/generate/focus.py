import json

from app.errors import UserError
from app.generate.llm import ChunkStreamer
from app.generate.partial_json import parse_partial_json

_SYSTEM = (
    "You select the lines of project notes that relate to the given topics. Reply with one JSON "
    'object {"lines": ["..."]}. Copy each chosen line exactly as written in the notes, never '
    "reword or merge lines. Choose a line if it is about a named topic or directly affects "
    "one, wherever it appears: also pick list items in a summary or next steps section that name "
    "a topic, and lines about cost or schedule effects on a topic. Leave out lines about other "
    "teams or subjects, and section headings alone."
)


async def select_focus_lines(stream: ChunkStreamer, source: str, focus: str) -> str:
    messages = [
        {"role": "system", "content": _SYSTEM},
        {"role": "user", "content": f"Topics: {focus}\n\nNotes:\n{source}"},
    ]
    text = ""
    # the reply copies lines of the notes, so its length grows with theirs (about 3 chars a token)
    async for chunk in stream(messages, max(1500, len(source) // 3)):
        text += chunk
    try:
        lines = json.loads(text).get("lines", [])
    except json.JSONDecodeError:
        # a reply cut off at the cap still holds every line before the last, unfinished one
        lines = parse_partial_json(text).get("lines", [])[:-1]
    # a line the model changed or made up is not in the notes, so it is dropped; a blank one
    # would match any notes
    kept = [
        line for line in lines if isinstance(line, str) and line.strip() and line.strip() in source
    ]
    if not kept:
        raise UserError(f"None of your notes relate to the focus: {focus}")
    return "\n".join(line.strip() for line in kept)
