import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import KeywordPanel from '../../components/KeywordPanel'
import { useCardStore } from '../../store'
import { PENDING, placeholderCard } from '../fixtures'

const state = () => useCardStore.getState()

beforeEach(() => {
  state().clear()
  state().load(placeholderCard(), [], PENDING, 's1')
})

describe('KeywordPanel', () => {
  it('lists one set of keywords for the whole card', () => {
    state().addKeywords(['Budget tight', 'Vendor unsigned'])

    render(<KeywordPanel />)

    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(screen.getByText('Budget tight')).toBeInTheDocument()
    expect(screen.getByText('Vendor unsigned')).toBeInTheDocument()
  })

  it('keeps a keyword listed after it was dragged into a block, marked as used', () => {
    state().addKeywords(['Vendor unsigned'])
    state().dragKeywordIn('risks', 'Vendor unsigned')

    render(<KeywordPanel />)

    expect(screen.getByText('Vendor unsigned')).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('shows nothing before a card exists', () => {
    state().clear()

    const { container } = render(<KeywordPanel />)

    expect(container).toBeEmptyDOMElement()
  })

  it('opens a tag field from the plus button and adds the keyword on Enter', async () => {
    render(<KeywordPanel />)

    await userEvent.click(screen.getByLabelText('Add a keyword'))
    await userEvent.type(screen.getByLabelText('Add a keyword'), 'Slow CI{Enter}')

    expect(state().keywords).toEqual([{ text: 'Slow CI', custom: true }])
    expect(screen.getByText('Slow CI')).toBeInTheDocument()
  })

  it('does not add a blank keyword', async () => {
    render(<KeywordPanel />)

    await userEvent.click(screen.getByLabelText('Add a keyword'))
    await userEvent.type(screen.getByLabelText('Add a keyword'), '   {Enter}')

    expect(state().keywords).toEqual([])
  })

  it('puts a cross on typed keywords only, and it deletes them', async () => {
    state().addCustomKeyword('Slow CI')
    state().addKeywords(['Model idea'])
    render(<KeywordPanel />)

    expect(screen.queryByLabelText('Remove keyword Model idea')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Remove keyword Slow CI'))

    expect(state().keywords).toEqual([{ text: 'Model idea', custom: false }])
  })

  it('sets the keyword payload when a chip starts dragging', () => {
    state().addKeywords(['Budget tight'])
    render(<KeywordPanel />)
    const setData = vi.fn()

    fireEvent.dragStart(screen.getByText('Budget tight'), { dataTransfer: { setData } })

    expect(setData).toHaveBeenCalledWith(
      'application/x-keyword',
      JSON.stringify({ text: 'Budget tight' }),
    )
  })
})
