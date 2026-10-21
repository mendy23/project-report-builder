import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CardCanvas from '../../components/CardCanvas'
import { useCardStore } from '../../store'
import { PENDING, placeholderCard } from '../fixtures'

vi.mock('../../llm/run', () => ({ enhanceBlock: vi.fn(), abortLlm: vi.fn() }))

const SENTENCE = 'Vendor is late, which delays the rollout.'
const PHRASE = 'which delays the rollout'
const state = () => useCardStore.getState()

function select(text: string) {
  vi.stubGlobal('getSelection', () => ({ toString: () => text }))
}

const textIn = (container: HTMLElement, field: string) =>
  within(container.querySelector(`[data-block-field="${field}"]`) as HTMLElement)

beforeEach(() => {
  state().clear()
  state().load(placeholderCard(), [], PENDING, 's1')
  state().finishDraft('summary', SENTENCE, [])
  state().finishDraft('title', 'Atlas', [])
})

afterEach(() => vi.unstubAllGlobals())

describe('ExcludeBox', () => {
  it('appears when selected summary text starts dragging', () => {
    select(PHRASE)
    render(<CardCanvas />)

    fireEvent.dragStart(screen.getByText(SENTENCE))

    expect(screen.getByText('Drop here to exclude')).toBeInTheDocument()
  })

  it('does not appear for a title selection', () => {
    select('Atlas')
    const { container } = render(<CardCanvas />)

    fireEvent.dragStart(textIn(container, 'title').getByText('Atlas'))

    expect(screen.queryByText('Drop here to exclude')).not.toBeInTheDocument()
  })

  it('does not appear when nothing is selected', () => {
    select('')
    render(<CardCanvas />)

    fireEvent.dragStart(screen.getByText(SENTENCE))

    expect(screen.queryByText('Drop here to exclude')).not.toBeInTheDocument()
  })

  it('cuts the dropped text from the summary and records the exclusion', () => {
    select(PHRASE)
    render(<CardCanvas />)

    fireEvent.dragStart(screen.getByText(SENTENCE))
    fireEvent.drop(screen.getByText('Drop here to exclude'))

    expect(state().card?.blocks.find((b) => b.id === 'sm')?.data.text).toBe('Vendor is late, .')
    expect(state().lists.summary.exclude).toEqual([PHRASE])
    expect(screen.queryByText('Drop here to exclude')).not.toBeInTheDocument()
  })

  it('hides again when the drag ends without a drop', () => {
    select(PHRASE)
    render(<CardCanvas />)

    fireEvent.dragStart(screen.getByText(SENTENCE))
    fireEvent.dragEnd(screen.getByText(SENTENCE))

    expect(screen.queryByText('Drop here to exclude')).not.toBeInTheDocument()
    expect(state().lists.summary.exclude).toEqual([])
  })
})
