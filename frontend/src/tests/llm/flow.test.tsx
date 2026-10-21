import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { abortLlm } from '../../llm/run'
import { useCardStore } from '../../store'
import { PENDING, placeholderCard } from '../fixtures'
import type { ChartSeries, DraftDone } from '../../types'

vi.mock('../../api', () => ({
  generateCard: vi.fn(),
  streamBlock: vi.fn(),
  streamDraft: vi.fn(),
}))
import { generateCard, streamBlock, streamDraft } from '../../api'

const EMPTY_VALUES: DraftDone['values'] = {
  title: '',
  status: 'on_track',
  summary: '',
  kpi: [],
  risks: [],
  next_steps: [],
}

function summaryIs(value: string, warnings: string[] = []) {
  vi.mocked(streamDraft).mockResolvedValue({
    values: { ...EMPTY_VALUES, summary: value },
    suggestions: [],
    warnings: { summary: warnings },
    failed: {},
  })
}

async function generate(charts: ChartSeries[] = []) {
  vi.mocked(generateCard).mockResolvedValue({
    card: placeholderCard(),
    charts,
    pending: PENDING,
    session_id: 's1',
  })
  render(<App />)
  await userEvent.type(screen.getByLabelText('Updates'), 'Atlas finished early.')
  await userEvent.click(screen.getByRole('button', { name: 'Generate card' }))
}

beforeEach(() => {
  abortLlm()
  useCardStore.getState().clear()
  vi.mocked(streamBlock).mockReset()
  vi.mocked(streamDraft).mockReset()
})

describe('card flow', () => {
  it('writes the summary into the card, then unlocks save', async () => {
    summaryIs('Atlas finished early.')

    await generate()

    expect(await screen.findByText('Atlas finished early.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled())
  })

  it('says it is writing and locks save and export until the blocks are done', async () => {
    vi.mocked(streamDraft).mockReturnValue(new Promise(() => {}))

    await generate()

    expect((await screen.findAllByRole('status', { name: 'Writing' })).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
  })

  it('shows a warning under the flagged block', async () => {
    summaryIs('Atlas finished 90% early.', ['The number 90 is not in your notes'])

    await generate()

    expect(await screen.findByText('The number 90 is not in your notes')).toBeInTheDocument()
  })

  it('shows why a block failed and the star writes it again', async () => {
    vi.mocked(streamDraft)
      .mockRejectedValueOnce(new Error('provider unreachable'))
      .mockResolvedValueOnce({
        values: { title: 'Atlas' },
        suggestions: [],
        warnings: {},
        failed: {},
      })

    await generate()
    expect(await screen.findAllByText(/provider unreachable/)).toHaveLength(6)
    await userEvent.click(screen.getByRole('button', { name: 'LLM enhancement: Title' }))

    await waitFor(() => expect(screen.getAllByText(/provider unreachable/)).toHaveLength(5))
  })

  it('shows an Untitled placeholder while the title is empty', async () => {
    vi.mocked(streamDraft).mockReturnValue(new Promise(() => {}))

    await generate()

    expect(await screen.findByPlaceholderText('Untitled')).toHaveValue('')
  })

  it('sends the focus topics with the notes and trims them', async () => {
    vi.mocked(streamDraft).mockReturnValue(new Promise(() => {}))
    vi.mocked(generateCard).mockResolvedValue({
      card: placeholderCard(),
      charts: [],
      pending: PENDING,
      session_id: 's1',
    })
    render(<App />)

    await userEvent.type(screen.getByLabelText('Focus (optional)'), ' network, security ')
    await userEvent.type(screen.getByLabelText('Updates'), 'Notes.')
    await userEvent.click(screen.getByRole('button', { name: 'Generate card' }))

    expect(generateCard).toHaveBeenCalledWith(
      expect.objectContaining({ focus: 'network, security', text: 'Notes.' }),
    )
  })

  it('hides and shows the blocks panel, keeping its open sections', async () => {
    summaryIs('Atlas finished early.')
    await generate([{ title: 'Velocity', kind: 'bar', points: [{ label: 'w1', value: '3' }] }])
    await screen.findByText('Atlas finished early.')
    await userEvent.click(screen.getByRole('button', { name: /Chart/ }))

    await userEvent.click(screen.getByRole('button', { name: 'Hide blocks panel' }))
    expect(screen.queryByRole('navigation', { name: 'Blocks' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show blocks panel' }))
    expect(screen.getByRole('navigation', { name: 'Blocks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chart/ })).toHaveAttribute('aria-expanded', 'true')
  })
})
