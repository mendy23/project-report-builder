import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { readImage } from '../../ingest/ocr'
import InputScreen from '../../screens/InputScreen'

vi.mock('../../ingest/ocr', () => ({ readImage: vi.fn() }))

function attach(...files: File[]) {
  fireEvent.change(document.getElementById('files') as HTMLInputElement, { target: { files } })
}

const notesBox = () => document.getElementById('notes') as HTMLTextAreaElement

describe('InputScreen file input', () => {
  it('adds a .txt file to the notes and shows it as a tag', async () => {
    render(<InputScreen onGenerated={() => {}} />)

    attach(new File(['Latency fell to 18 ms.'], 'cross-team-notes.txt', { type: 'text/plain' }))

    await waitFor(() =>
      expect(notesBox().value).toContain('cross-team-notes.txt:\nLatency fell to 18 ms.'),
    )
    expect(screen.getByText('cross-team-notes.txt')).toBeInTheDocument()
  })

  it('removes the text from the notes when its tag is removed', async () => {
    render(<InputScreen onGenerated={() => {}} />)
    attach(new File(['Budget is $2.4M.'], 'email-finance.txt', { type: 'text/plain' }))
    await waitFor(() => expect(notesBox().value).toContain('Budget is $2.4M.'))

    fireEvent.click(screen.getByRole('button', { name: /email-finance\.txt/ }))

    expect(notesBox().value).not.toContain('Budget is $2.4M.')
  })

  it('adds .md and .json files to the notes even without a MIME type', async () => {
    render(<InputScreen onGenerated={() => {}} />)

    attach(
      new File(['# Standup\nWi-Fi rollout on track.'], 'standup.md'),
      new File(['{"latency_ms": 18}'], 'metrics.json'),
    )

    await waitFor(() => expect(notesBox().value).toContain('metrics.json:\n{"latency_ms": 18}'))
    expect(notesBox().value).toContain('standup.md:\n# Standup\nWi-Fi rollout on track.')
  })

  it('stays busy while an image is read, even when a text file finishes first', async () => {
    let finishOcr!: (text: string) => void
    vi.mocked(readImage).mockReturnValue(new Promise((resolve) => (finishOcr = resolve)))
    render(<InputScreen onGenerated={() => {}} />)

    attach(new File(['png'], 'chat.png', { type: 'image/png' }))
    attach(new File(['Wi-Fi on track.'], 'standup.txt', { type: 'text/plain' }))
    await waitFor(() => expect(notesBox().value).toContain('Wi-Fi on track.'))
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled()

    finishOcr('Latency 18 ms')
    expect(await screen.findByRole('button', { name: 'Generate card' })).toBeEnabled()
  })

  it('keeps a CSV out of the notes', async () => {
    render(<InputScreen onGenerated={() => {}} />)

    attach(new File(['week,latency_ms\nWeek 37,42'], 'network-latency.csv', { type: 'text/csv' }))

    await waitFor(() => expect(screen.getByText('network-latency.csv')).toBeInTheDocument())
    expect(notesBox().value).toBe('')
  })
})
