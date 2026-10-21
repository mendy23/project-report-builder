import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import InlineText from '../../components/InlineText'

function Controlled(props: Partial<React.ComponentProps<typeof InlineText>>) {
  const [value, setValue] = useState('Atlas')
  return <InlineText label="Name" value={value} onChange={setValue} {...props} />
}

describe('InlineText', () => {
  it('shows the value and reports what is typed', async () => {
    const onChange = vi.fn()
    render(<InlineText label="Name" value="Atlas" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Name'), '!')

    expect(screen.getByLabelText('Name')).toHaveValue('Atlas')
    expect(onChange).toHaveBeenCalledWith('Atlas!')
  })

  it('cannot be typed into when read-only', async () => {
    const onChange = vi.fn()
    render(<InlineText label="Name" value="Atlas" onChange={onChange} readOnly />)

    await userEvent.type(screen.getByLabelText('Name'), 'x')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onEnter instead of adding a line break', async () => {
    const onEnter = vi.fn()
    render(<Controlled onEnter={onEnter} />)

    await userEvent.type(screen.getByLabelText('Name'), '{Enter}')

    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Name')).toHaveValue('Atlas')
  })

  it('calls onBackspaceEmpty only when the text is already empty', async () => {
    const onBackspaceEmpty = vi.fn()
    const { rerender } = render(
      <InlineText label="Name" value="A" onChange={() => {}} onBackspaceEmpty={onBackspaceEmpty} />,
    )
    await userEvent.type(screen.getByLabelText('Name'), '{Backspace}')
    expect(onBackspaceEmpty).not.toHaveBeenCalled()

    rerender(
      <InlineText label="Name" value="" onChange={() => {}} onBackspaceEmpty={onBackspaceEmpty} />,
    )
    await userEvent.type(screen.getByLabelText('Name'), '{Backspace}')
    expect(onBackspaceEmpty).toHaveBeenCalledTimes(1)
  })
})
