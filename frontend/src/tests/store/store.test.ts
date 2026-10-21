import { beforeEach, describe, expect, it } from 'vitest'

import { fieldOfBlock } from '../../store/llmSlice'
import { useCardStore } from '../../store'
import { PENDING, placeholderCard } from '../fixtures'

const state = () => useCardStore.getState()
const dataOf = (id: string) => state().card!.blocks.find((b) => b.id === id)?.data

beforeEach(() => {
  state().clear()
  state().load(placeholderCard(), [], PENDING, 's1')
})

describe('setCardStatus', () => {
  it('replaces the label and tone of the status block, not just the card status', () => {
    state().setCardStatus('blocked')

    expect(state().card!.status).toBe('blocked')
    expect(dataOf('st')).toEqual({ label: 'Blocked', tone: 'blocked' })
  })
})

describe('finishDraft', () => {
  it('removes an empty summary placeholder', () => {
    state().finishDraft('summary', '', [])

    expect(dataOf('sm')).toBeUndefined()
  })

  it('removes an empty list placeholder', () => {
    state().finishDraft('risks', [], [])

    expect(dataOf('r')).toBeUndefined()
  })

  it('never removes the header for an empty title', () => {
    state().finishDraft('title', '', [])

    expect(dataOf('h')).toBeDefined()
  })

  it('writes the value without touching the keyword list', () => {
    state().addKeywords(['Latency dropped 44%'])
    state().finishDraft('summary', 'Done early.', [])

    expect(state().keywords).toEqual([{ text: 'Latency dropped 44%', custom: false }])
    expect(dataOf('sm')).toEqual({ text: 'Done early.' })
  })

  it('stores the warnings under the field', () => {
    state().finishDraft('summary', 'x', ['The number 9 is not in your notes'])

    expect(state().llm.warnings.summary).toEqual(['The number 9 is not in your notes'])
  })
})

describe('finishEnhance', () => {
  it('keeps the block even when the rewrite comes back empty', () => {
    state().finishEnhance('summary', '', [])

    expect(dataOf('sm')).toEqual({ text: '' })
  })

  it('clears the pending chips but keeps include', () => {
    state().dragKeywordIn('summary', 'Latency dropped 44%')

    state().finishEnhance('summary', 'Better text.', [])

    expect(state().lists.summary.pending).toEqual([])
    expect(state().lists.summary.include).toEqual(['Latency dropped 44%'])
  })
})

describe('undoRemove', () => {
  it('puts the last deleted block back at its old position', () => {
    const before = state().card!.blocks.map((b) => b.id)

    state().removeBlock('sm')
    expect(state().card!.blocks.some((b) => b.id === 'sm')).toBe(false)
    state().undoRemove()

    expect(state().card!.blocks.map((b) => b.id)).toEqual(before)
    expect(state().removed).toEqual([])
  })

  it('does nothing when nothing was deleted', () => {
    const before = state().card

    state().undoRemove()

    expect(state().card).toBe(before)
  })
})

describe('keyword list', () => {
  it('adds model keywords once and keeps typed ones marked custom', () => {
    state().addKeywords(['a', 'a', 'b'])
    state().addCustomKeyword('b')
    state().addCustomKeyword('c')

    expect(state().keywords).toEqual([
      { text: 'a', custom: false },
      { text: 'b', custom: false },
      { text: 'c', custom: true },
    ])
  })

  it('removes a keyword', () => {
    state().addKeywords(['a', 'b'])

    state().removeKeyword('a')

    expect(state().keywords).toEqual([{ text: 'b', custom: false }])
  })
})

describe('excludePhrase', () => {
  it('cuts the phrase from the block text and records the exclusion', () => {
    state().applyBlockValue('summary', 'Vendor is late, which delays the rollout.')

    state().excludePhrase('summary', 'which delays the rollout')

    expect(dataOf('sm')).toEqual({ text: 'Vendor is late, .' })
    expect(state().lists.summary.exclude).toEqual(['which delays the rollout'])
  })

  it('records the exclusion even when the phrase is no longer in the text', () => {
    state().applyBlockValue('summary', 'Nothing relevant')

    state().excludePhrase('summary', 'gone phrase')

    expect(dataOf('sm')).toEqual({ text: 'Nothing relevant' })
    expect(state().lists.summary.exclude).toEqual(['gone phrase'])
  })
})

describe('keyword actions', () => {
  it('dragKeywordIn moves a suggestion into include as a pending chip', () => {
    state().addKeywords(['Budget tight'])

    state().dragKeywordIn('risks', 'Budget tight')

    expect(state().lists.risks).toMatchObject({
      include: ['Budget tight'],
      pending: ['Budget tight'],
    })
    expect(state().keywords).toEqual([{ text: 'Budget tight', custom: false }])
  })

  it('undoChip returns a pending chip to exclude', () => {
    state().dragKeywordIn('risks', 'Budget tight')

    state().undoChip('risks', 'Budget tight')

    expect(state().lists.risks).toMatchObject({
      include: [],
      exclude: ['Budget tight'],
      pending: [],
    })
  })

  it('a plain edit with updateBlockData leaves include and exclude alone', () => {
    state().dragKeywordIn('summary', 'a')

    state().updateBlockData('sm', { text: 'edited by hand' })

    expect(state().lists.summary).toMatchObject({ include: ['a'], exclude: [], pending: ['a'] })
  })
})

describe('block status', () => {
  it('failBlock records the error for that block only', () => {
    state().failBlock('risks', 'provider unreachable')

    expect(state().llm.blockStatus.risks).toBe('error')
    expect(state().llm.blockError.risks).toBe('provider unreachable')
    expect(state().llm.blockStatus.summary).toBeUndefined()
  })
})

describe('fieldOfBlock', () => {
  it('finds the field a block is the placeholder for', () => {
    expect(fieldOfBlock(PENDING, 'r')).toBe('risks')
  })

  it('returns null for a block the model does not write', () => {
    expect(fieldOfBlock(PENDING, 'chart-1')).toBeNull()
  })
})

describe('session', () => {
  it('load keeps the session id the generate call returned', () => {
    expect(state().llm.sessionId).toBe('s1')
  })

  it('beginPipeline keeps the session id', () => {
    state().beginPipeline()

    expect(state().llm.sessionId).toBe('s1')
    expect(state().llm.status).toBe('streaming')
  })
})
