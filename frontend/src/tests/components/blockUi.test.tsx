import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardCanvas from '../../components/CardCanvas'
import KeywordPanel from '../../components/KeywordPanel'
import { useCardStore } from '../../store'
import { PENDING, placeholderCard } from '../fixtures'

vi.mock('../../llm/run', () => ({ enhanceBlock: vi.fn(), abortLlm: vi.fn() }))
import { enhanceBlock } from '../../llm/run'

const state = () => useCardStore.getState()

function dropPayload(text: string) {
  const getData = (type: string) =>
    type === 'application/x-keyword' ? JSON.stringify({ text }) : ''
  return { dataTransfer: { getData } }
}

const blockOf = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-block-field="${field}"]`) as HTMLElement

beforeEach(() => {
  vi.mocked(enhanceBlock).mockReset()
  state().clear()
  state().load(placeholderCard(), [], PENDING, 's1')
  state().finishDraft('summary', 'Atlas done early.', [])
  state().finishDraft('risks', ['Vendor late'], [])
})

describe('keyword drops', () => {
  it('adds a dropped keyword to the block as a pending chip and keeps it in the panel', () => {
    state().addKeywords(['Latency 44%'])
    const { container } = render(
      <>
        <KeywordPanel />
        <CardCanvas />
      </>,
    )

    fireEvent.drop(blockOf(container, 'summary'), dropPayload('Latency 44%'))

    expect(state().lists.summary).toMatchObject({
      include: ['Latency 44%'],
      pending: ['Latency 44%'],
    })
    expect(screen.getAllByText('Latency 44%').length).toBeGreaterThan(1)
    expect(
      within(blockOf(container, 'summary')).getByLabelText('Remove keyword Latency 44%'),
    ).toBeInTheDocument()
  })

  it('accepts the same keyword on a second block', () => {
    const { container } = render(<CardCanvas />)

    fireEvent.drop(blockOf(container, 'summary'), dropPayload('Latency 44%'))
    fireEvent.drop(blockOf(container, 'risks'), dropPayload('Latency 44%'))

    expect(state().lists.summary.pending).toEqual(['Latency 44%'])
    expect(state().lists.risks.pending).toEqual(['Latency 44%'])
  })

  it('ignores a keyword dropped on the status block', () => {
    const { container } = render(<CardCanvas />)

    fireEvent.drop(blockOf(container, 'status'), dropPayload('Latency 44%'))

    expect(state().lists.status.pending).toEqual([])
  })
})

describe('star button', () => {
  it('asks to rewrite that block', async () => {
    render(<CardCanvas />)

    await userEvent.click(screen.getByRole('button', { name: 'LLM enhancement: Summary' }))

    expect(enhanceBlock).toHaveBeenCalledWith('summary')
  })

  it('is disabled while that block is streaming', () => {
    state().setBlockStatus('summary', 'streaming')

    render(<CardCanvas />)

    expect(screen.getByRole('button', { name: 'LLM enhancement: Summary' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'LLM enhancement: Risks' })).toBeEnabled()
  })

  it('appears on model-written blocks only, not on chart blocks or the status tag', () => {
    state().addBlock('chart')

    render(<CardCanvas />)

    expect(screen.getAllByRole('button', { name: /^LLM enhancement/ })).toHaveLength(5)
  })
})

describe('pending chips', () => {
  it('lets the user undo a chip with its ×', async () => {
    state().dragKeywordIn('summary', 'Latency 44%')
    render(<CardCanvas />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove keyword Latency 44%' }))

    expect(state().lists.summary).toMatchObject({
      include: [],
      exclude: ['Latency 44%'],
      pending: [],
    })
  })

  it('has no add field in a block, even a selected one', () => {
    state().selectBlock('sm')
    render(<CardCanvas />)

    expect(screen.queryByLabelText(/^Add keyword/)).not.toBeInTheDocument()
  })
})

describe('reordering', () => {
  it('moves from the block wrapper to a drag handle', () => {
    const { container } = render(<CardCanvas />)
    const block = blockOf(container, 'summary')

    expect(block).not.toHaveAttribute('draggable', 'true')
    expect(within(block).getByLabelText('Drag to reorder')).toHaveAttribute('draggable', 'true')
  })
})

describe('block errors', () => {
  it('shows why a block could not be written', () => {
    state().failBlock('summary', 'provider unreachable')

    render(<CardCanvas />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't write this block: provider unreachable",
    )
  })
})

describe('inline editing', () => {
  it('edits the summary in place, without a second editor', async () => {
    const { container } = render(<CardCanvas />)

    await userEvent.click(blockOf(container, 'summary'))
    await userEvent.type(within(blockOf(container, 'summary')).getByLabelText('Summary'), '!')

    expect(blockOf(container, 'summary').querySelectorAll('textarea')).toHaveLength(1)
    expect(state().card?.blocks.find((b) => b.id === 'sm')?.data.text).toBe('Atlas done early.!')
  })

  it('keeps blocks read-only while the pipeline is still writing them', async () => {
    state().beginPipeline()
    const { container } = render(<CardCanvas />)

    await userEvent.type(within(blockOf(container, 'summary')).getByLabelText('Summary'), '!')

    expect(state().card?.blocks.find((b) => b.id === 'sm')?.data.text).toBe('Atlas done early.')
  })
})

describe('writing dots', () => {
  it('show in a streaming block until its first words arrive', () => {
    state().beginPipeline()
    state().applyBlockValue('summary', '')
    state().setBlockStatus('summary', 'streaming')
    render(<CardCanvas />)

    expect(screen.getByRole('status', { name: 'Writing' })).toBeInTheDocument()

    act(() => state().applyBlockValue('summary', 'Atlas'))

    expect(screen.queryByRole('status', { name: 'Writing' })).not.toBeInTheDocument()
  })
})

describe('star rewrite', () => {
  it('locks the block while its rewrite streams, then unlocks it', () => {
    const { container } = render(<CardCanvas />)
    const summary = () => within(blockOf(container, 'summary')).getByLabelText('Summary')

    act(() => state().setBlockStatus('summary', 'streaming'))
    expect(summary()).toHaveAttribute('readonly')

    act(() => state().finishEnhance('summary', 'Atlas done early, under budget.', []))
    expect(summary()).not.toHaveAttribute('readonly')
  })
})
