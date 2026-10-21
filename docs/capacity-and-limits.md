# Capacity & limits

What the POC can handle, and what is not yet ideal. Both live here because for a project this
size they are mostly the same list.

## Capacity

- **Draft time.** About 5 s per card on a local `qwen3:4b`, 12 s on `qwen3:8b`, measured on a
  Mac with Ollama over the seven `mock-data/atlas` scenarios. A cloud model is usually faster
  but subject to its rate limit.
- **Calls per card.** One draft call (two with a focus). Each star is one more call.
- **Rate limits.** The OpenAI client retries up to 5 times, which lets a per-minute limit clear 
  instead of failing the block.
- **Input size.** No hard cap on notes. The draft's output cap is fixed per block, but the
  focus call's cap grows with the notes (about one token per 3 characters, minimum 1,500).
  Very long notes will hit the model's context window first.
- **Images.** Up to 10 MB per screenshot; OCR runs in the browser, so speed depends on the
  user's machine.

## Known limitations

- **Sessions are in memory.** One process, one dict. A restart loses every session, and a
  second worker would not see the first one's sessions. Fine for a demo; anything shared needs
  a real store.
- **No auth, no multi-user.** Anyone who can reach the backend can use it and the configured
  key.
- **Verification is lexical.** It catches invented numbers and off-topic sentences, not
  flipped meaning. See [generation.md](generation.md#verification).
- **Chart detection is heuristic.** The kind is guessed from header and label keywords, and
  only fully numeric columns become series; a single blank or `n/a` cell drops the column.
- **English only.** Strings are in `i18n/en.json`, but there is no other locale yet.
- **Export is client-side.** How well the rich-text paste looks depends on the app it is
  pasted into.
