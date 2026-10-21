import { streamBlock, streamDraft } from '../api'
import { useCardStore } from '../store'
import { currentValue, isEmptyValue } from './apply'
import type { BlockField } from '../types'

const controllers = new Set<AbortController>()

export function abortLlm() {
  controllers.forEach((controller) => controller.abort())
  controllers.clear()
}

const store = () => useCardStore.getState()
const messageOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

// after Back or a newer run, an aborted run's results must not touch the store
function newRun() {
  const controller = new AbortController()
  controllers.add(controller)
  return { signal: controller.signal, current: () => !controller.signal.aborted }
}

async function enhance(field: BlockField, run: ReturnType<typeof newRun>): Promise<void> {
  const { card, lists, llm } = store()
  const request = {
    session_id: llm.sessionId as string,
    block: field,
    add: lists[field].pending,
    exclude: lists[field].exclude,
    current: card ? currentValue(card, llm.pending, field) : null,
  }
  store().setBlockStatus(field, 'streaming')
  try {
    const done = await streamBlock(
      request,
      {
        onPartial: (partial) => {
          if (run.current() && partial.value !== undefined) {
            store().applyBlockValue(field, partial.value)
          }
        },
      },
      run.signal,
    )
    if (run.current()) store().finishEnhance(field, done.value, done.warnings)
  } catch (cause) {
    if (!run.current()) return
    // the partials replaced the block's text as they arrived, so put the original back
    store().applyBlockValue(field, request.current)
    store().failBlock(field, messageOf(cause))
  }
}

async function draft(blocks: BlockField[], run: ReturnType<typeof newRun>): Promise<void> {
  const { lists, llm } = store()
  blocks.forEach((field) => store().setBlockStatus(field, 'streaming'))
  try {
    const done = await streamDraft(
      {
        session_id: llm.sessionId as string,
        blocks,
        exclude: Object.fromEntries(blocks.map((field) => [field, lists[field].exclude])),
      },
      {
        onPartial: (partial) => {
          if (!run.current()) return
          for (const field of blocks) {
            if (partial[field] !== undefined) store().applyBlockValue(field, partial[field])
          }
        },
      },
      run.signal,
    )
    if (!run.current()) return
    store().addKeywords(done.suggestions)
    for (const field of blocks) {
      const failure = done.failed[field]
      if (failure) store().failBlock(field, failure)
      else store().finishDraft(field, done.values[field], done.warnings[field] ?? [])
    }
  } catch (cause) {
    if (run.current()) blocks.forEach((field) => store().failBlock(field, messageOf(cause)))
  }
}

export async function runPipeline(): Promise<void> {
  abortLlm()
  const run = newRun()
  store().beginPipeline()
  await draft(Object.keys(store().llm.pending) as BlockField[], run)
  if (run.current()) store().finishPipeline()
}

// the star revises the text; a block whose first draft failed is still empty, so it drafts again
export async function enhanceBlock(field: BlockField): Promise<void> {
  const { card, llm } = store()
  const empty = !card || isEmptyValue(currentValue(card, llm.pending, field))
  await (empty ? draft([field], newRun()) : enhance(field, newRun()))
}

export async function addGenerated(field: BlockField): Promise<void> {
  const { card, llm } = store()
  const existing = card?.blocks.find((b) => b.id === llm.pending[field])
  if (existing) {
    store().selectBlock(existing.id)
    return
  }
  store().addGeneratedBlock(field)
  await enhanceBlock(field)
}
