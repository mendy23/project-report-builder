import { beforeEach, describe, expect, it, vi } from 'vitest'

import { abortLlm, addGenerated, enhanceBlock, runPipeline } from '../../llm/run'
import { useCardStore } from '../../store'
import { PENDING, placeholderCard } from '../fixtures'
import type { DraftDone } from '../../types'

vi.mock('../../api', () => ({ streamBlock: vi.fn(), streamDraft: vi.fn() }))
import { streamBlock, streamDraft } from '../../api'

const NOTHING: DraftDone = { values: {}, suggestions: [], warnings: {}, failed: {} }
const EMPTY_VALUES: DraftDone['values'] = {
  title: '',
  status: 'on_track',
  summary: '',
  kpi: [],
  risks: [],
  next_steps: [],
}

const state = () => useCardStore.getState()
const byId = (id: string) => state().card?.blocks.find((b) => b.id === id)
const requests = () => vi.mocked(streamBlock).mock.calls.map((call) => call[0])

function gate() {
  let open = () => {}
  const promise = new Promise<void>((resolve) => (open = resolve))
  return { promise, open }
}

beforeEach(() => {
  abortLlm()
  state().load(placeholderCard(), [], PENDING, 's1')
  vi.mocked(streamBlock).mockReset()
  vi.mocked(streamDraft).mockReset()
})

describe('runPipeline', () => {
  it('drafts every pending block in one request with the session id', async () => {
    vi.mocked(streamDraft).mockResolvedValue(NOTHING)

    await runPipeline()

    expect(streamDraft).toHaveBeenCalledTimes(1)
    const request = vi.mocked(streamDraft).mock.calls[0][0]
    expect(request.session_id).toBe('s1')
    expect([...request.blocks].sort()).toEqual(Object.keys(PENDING).sort())
  })

  it('skips the title when the project name was typed', async () => {
    vi.mocked(streamDraft).mockResolvedValue(NOTHING)
    const { title: _title, ...withoutTitle } = PENDING
    state().load(placeholderCard(), [], withoutTitle, 's1')

    await runPipeline()

    expect(vi.mocked(streamDraft).mock.calls[0][0].blocks).not.toContain('title')
  })

  it('writes each partial field into its own block while the reply streams', async () => {
    vi.mocked(streamDraft).mockImplementation(async (_request, handlers) => {
      handlers.onPartial({ title: 'Atlas', summary: 'Atlas phase', status: 'at_risk' })
      await new Promise(() => {})
      return NOTHING
    })

    void runPipeline()
    await vi.waitFor(() => expect(byId('sm')?.data.text).toBe('Atlas phase'))

    expect(byId('h')?.data.project_name).toBe('Atlas')
    expect(byId('st')?.data.tone).toBe('at_risk')
    expect(byId('r')?.data.items).toEqual([])
    expect(state().llm.blockStatus.summary).toBe('streaming')
  })

  it('stores the keywords, keeps warnings and removes empty placeholders', async () => {
    vi.mocked(streamDraft).mockResolvedValue({
      values: { ...EMPTY_VALUES, summary: 'Done early.' },
      suggestions: ['Latency 44%'],
      warnings: { summary: ['The number 90 is not in your notes'] },
      failed: {},
    })

    await runPipeline()

    expect(state().keywords).toEqual([{ text: 'Latency 44%', custom: false }])
    expect(state().llm.warnings.summary).toEqual(['The number 90 is not in your notes'])
    expect(byId('sm')?.data.text).toBe('Done early.')
    expect(byId('r')).toBeUndefined()
    expect(state().llm.blockStatus.summary).toBe('done')
    expect(state().llm.status).toBe('done')
  })

  it('fails only the blocks the model got wrong', async () => {
    vi.mocked(streamDraft).mockResolvedValue({
      ...NOTHING,
      values: { ...EMPTY_VALUES, summary: 'Fine.' },
      failed: { risks: 'The model did not write the risks block' },
    })

    await runPipeline()

    expect(state().llm.blockStatus.risks).toBe('error')
    expect(state().llm.blockError.risks).toBe('The model did not write the risks block')
    expect(state().llm.blockStatus.summary).toBe('done')
    expect(state().llm.status).toBe('done')
  })

  it('fails every block when the request itself fails', async () => {
    vi.mocked(streamDraft).mockRejectedValue(new Error('boom'))

    await runPipeline()

    for (const field of Object.keys(PENDING)) {
      expect(state().llm.blockStatus[field as keyof typeof PENDING]).toBe('error')
      expect(state().llm.blockError[field as keyof typeof PENDING]).toBe('boom')
    }
    expect(state().llm.status).toBe('done')
  })

  it('writes nothing after Back clears the store while the reply streams', async () => {
    const drafting = gate()
    vi.mocked(streamDraft).mockImplementation(async () => {
      await drafting.promise
      return {
        ...NOTHING,
        values: { ...EMPTY_VALUES, summary: 'late text' },
        suggestions: ['late'],
      }
    })

    const run = runPipeline()
    await vi.waitFor(() => expect(streamDraft).toHaveBeenCalled())
    abortLlm()
    state().clear()
    drafting.open()
    await run

    expect(state().card).toBeNull()
    expect(state().llm.status).toBe('idle')
    expect(state().keywords).toEqual([])
  })
})

describe('enhanceBlock', () => {
  async function withSummary(text: string) {
    state().applyBlockValue('summary', text)
    state().setBlockStatus('summary', 'done')
  }

  it('sends the pending keywords, the exclude list and the current text', async () => {
    await withSummary('Original.')
    state().excludePhrase('summary', 'nope')
    state().dragKeywordIn('summary', 'extra')
    vi.mocked(streamBlock).mockResolvedValue({
      value: 'Rewritten.',
      warnings: [],
    })

    await enhanceBlock('summary')

    expect(requests()[0]).toEqual({
      session_id: 's1',
      block: 'summary',
      add: ['extra'],
      exclude: ['nope'],
      current: 'Original.',
    })
    expect(byId('sm')?.data.text).toBe('Rewritten.')
    expect(state().lists.summary.pending).toEqual([])
  })

  it('sends only keywords added since the last rewrite', async () => {
    await withSummary('Original.')
    vi.mocked(streamBlock).mockResolvedValue({ value: 'V1.', warnings: [] })
    state().dragKeywordIn('summary', 'first')
    await enhanceBlock('summary')
    state().dragKeywordIn('summary', 'second')

    await enhanceBlock('summary')

    expect(requests()[1].add).toEqual(['second'])
    expect(requests()[1].current).toBe('V1.')
  })

  it('sends the current items of a list block', async () => {
    state().applyBlockValue('risks', ['Vendor late'])
    state().setBlockStatus('risks', 'done')
    vi.mocked(streamBlock).mockResolvedValue({
      value: ['Vendor late', 'Budget tight'],
      warnings: [],
    })
    state().dragKeywordIn('risks', 'Budget tight')

    await enhanceBlock('risks')

    expect(requests()[0].current).toEqual(['Vendor late'])
    expect(byId('r')?.data.items).toEqual(['Vendor late', 'Budget tight'])
  })

  it('drafts again when the first draft failed and the block is still empty', async () => {
    state().failBlock('summary', 'provider unreachable')
    state().excludePhrase('summary', 'nope')
    vi.mocked(streamDraft).mockResolvedValue({
      ...NOTHING,
      values: { summary: 'Now written.' },
      suggestions: ['s'],
    })

    await enhanceBlock('summary')

    expect(vi.mocked(streamDraft).mock.calls[0][0]).toEqual({
      session_id: 's1',
      blocks: ['summary'],
      exclude: { summary: ['nope'] },
    })
    expect(streamBlock).not.toHaveBeenCalled()
    expect(byId('sm')?.data.text).toBe('Now written.')
    expect(state().keywords).toEqual([{ text: 's', custom: false }])
  })

  it('keeps the block when the rewrite fails', async () => {
    await withSummary('Original.')
    vi.mocked(streamBlock).mockRejectedValue(new Error('rate limited'))

    await enhanceBlock('summary')

    expect(byId('sm')?.data.text).toBe('Original.')
    expect(state().llm.blockError.summary).toBe('rate limited')
  })

  it('puts the original text back when the rewrite fails after streaming part of it', async () => {
    await withSummary('Original.')
    vi.mocked(streamBlock).mockImplementation(async (_request, handlers) => {
      handlers.onPartial({ value: 'Half writ' })
      throw new Error('connection dropped')
    })

    await enhanceBlock('summary')

    expect(byId('sm')?.data.text).toBe('Original.')
    expect(state().llm.blockError.summary).toBe('connection dropped')
  })
})

describe('addGenerated', () => {
  it('adds a block for a removed field and writes it like a star click', async () => {
    state().removeBlock('r')
    vi.mocked(streamDraft).mockResolvedValue({
      ...NOTHING,
      values: { risks: ['Vendor late'] },
    })

    await addGenerated('risks')

    expect(vi.mocked(streamDraft).mock.calls[0][0].blocks).toEqual(['risks'])
    const block = byId(state().llm.pending.risks)
    expect(block?.type).toBe('list')
    expect(block?.data).toEqual({ title: 'Risks', items: ['Vendor late'] })
  })

  it('only selects the block when its field is already on the card', async () => {
    await addGenerated('risks')

    expect(streamDraft).not.toHaveBeenCalled()
    expect(state().selectedBlockId).toBe('r')
  })
})
