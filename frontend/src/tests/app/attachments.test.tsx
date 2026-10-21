import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import App from '../../App'

vi.mock('../../ingest/ocr', () => ({ readImage: vi.fn(async () => 'Latency, 180 ms') }))

async function attach(...files: File[]) {
  await userEvent.upload(document.querySelector<HTMLInputElement>('#files')!, files)
}

describe('attachments', () => {
  it('shows each file as a tag and adds its text under the filename', async () => {
    render(<App />)

    await attach(new File(['x'], 'dash.png', { type: 'image/png' }))
    await attach(new File(['x'], 'road.png', { type: 'image/png' }))

    await screen.findByText('road.png')
    expect(screen.getByLabelText('Updates')).toHaveValue(
      'dash.png:\nLatency, 180 ms\n\nroad.png:\nLatency, 180 ms\n\n',
    )
    expect(screen.getByText('dash.png')).toBeInTheDocument()
  })

  it('removing a tag also removes its text', async () => {
    render(<App />)
    await attach(new File(['x'], 'dash.png', { type: 'image/png' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Remove dash.png' }))

    expect(screen.queryByText('dash.png')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Updates')).toHaveValue('')
  })
})
