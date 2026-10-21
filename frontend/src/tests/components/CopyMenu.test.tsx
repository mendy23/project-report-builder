import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import CopyMenu from '../../components/CopyMenu'

const OPTIONS = [
  { id: 'html', label: 'Rich text', best: 'Best for email.', tested: 'Tested in Gmail.' },
  { id: 'text', label: 'Plain text', best: 'Works anywhere.', tested: 'Not tested.' },
]

describe('CopyMenu', () => {
  it('lists the formats on hover and copies the one picked', async () => {
    const onCopy = vi.fn()
    render(<CopyMenu options={OPTIONS} disabled={false} onCopy={onCopy} />)
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()

    await userEvent.hover(screen.getByRole('button', { name: /Copy as/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Plain text/ }))

    expect(onCopy).toHaveBeenCalledWith('text')
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('also opens on click and stays shut while disabled', async () => {
    const { rerender } = render(<CopyMenu options={OPTIONS} disabled={false} onCopy={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Copy as/ }))
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)

    rerender(<CopyMenu options={OPTIONS} disabled onCopy={vi.fn()} />)

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })
})
