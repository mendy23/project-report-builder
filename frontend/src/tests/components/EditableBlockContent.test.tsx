import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import EditableBlockContent from '../../components/EditableBlockContent'
import { useCardStore } from '../../store'
import { PENDING, placeholderCard } from '../fixtures'

const state = () => useCardStore.getState()
const byId = (id: string) => state().card!.blocks.find((b) => b.id === id)!

// shows the live store block, so typing re-renders like it does on the canvas
function Live({ id, readOnly }: { id: string; readOnly?: boolean }) {
  const block = useCardStore((s) => s.card!.blocks.find((b) => b.id === id)!)
  return <EditableBlockContent block={block} readOnly={readOnly} />
}

beforeEach(() => {
  state().clear()
  state().load(placeholderCard(), [], PENDING, 's1')
})

describe('EditableBlockContent', () => {
  it('edits the project name, with an Untitled placeholder while empty', async () => {
    render(<Live id="h" />)
    const name = screen.getByLabelText('Project name')
    expect(name).toHaveAttribute('placeholder', 'Untitled')

    await userEvent.type(name, 'Atlas')

    expect(byId('h').data.project_name).toBe('Atlas')
  })

  it('edits the author next to the date', async () => {
    render(<Live id="h" />)

    await userEvent.type(screen.getByLabelText('Author'), 'Mendy')

    expect(byId('h').data.author).toBe('Mendy')
  })

  it('edits the status label and the summary', async () => {
    render(
      <>
        <Live id="st" />
        <Live id="sm" />
      </>,
    )

    await userEvent.type(screen.getByLabelText('Summary'), 'Done early.')
    await userEvent.clear(screen.getByLabelText('Status'))
    await userEvent.type(screen.getByLabelText('Status'), 'Late')

    expect(byId('sm').data.text).toBe('Done early.')
    expect(byId('st').data.label).toBe('Late')
  })

  it('edits each KPI value and label', async () => {
    state().updateBlockData('kpi', { metrics: [{ label: 'Latency', value: '180 ms' }] })
    render(<Live id="kpi" />)

    await userEvent.type(screen.getByLabelText('Metric value 1'), '!')
    await userEvent.type(screen.getByLabelText('Metric label 1'), '?')

    expect(byId('kpi').data.metrics).toEqual([{ label: 'Latency?', value: '180 ms!' }])
  })

  it('edits the title and the items of a list', async () => {
    state().updateBlockData('r', { items: ['Vendor late'] })
    render(<Live id="r" />)

    await userEvent.type(screen.getByLabelText('List title'), 's')
    await userEvent.type(screen.getByLabelText('Item 1'), '!')

    expect(byId('r').data).toEqual({ title: 'Riskss', items: ['Vendor late!'] })
  })

  it('Enter adds an item below and focuses it', async () => {
    state().updateBlockData('r', { items: ['One', 'Three'] })
    render(<Live id="r" />)

    await userEvent.type(screen.getByLabelText('Item 1'), '{Enter}')

    expect(byId('r').data.items).toEqual(['One', '', 'Three'])
    expect(screen.getByLabelText('Item 2')).toHaveFocus()
  })

  it('Backspace on an empty item removes it and focuses the one above', async () => {
    state().updateBlockData('r', { items: ['One', ''] })
    render(<Live id="r" />)

    await userEvent.type(screen.getByLabelText('Item 2'), '{Backspace}')

    expect(byId('r').data.items).toEqual(['One'])
    expect(screen.getByLabelText('Item 1')).toHaveFocus()
  })

  it('keeps the last item when Backspace is pressed on it while empty', async () => {
    state().updateBlockData('r', { items: [''] })
    render(<Live id="r" />)

    await userEvent.type(screen.getByLabelText('Item 1'), '{Backspace}')

    expect(byId('r').data.items).toEqual([''])
  })

  it('drops an item left empty when focus leaves it', async () => {
    state().updateBlockData('r', { items: ['One', ''] })
    render(
      <>
        <Live id="r" />
        <button>elsewhere</button>
      </>,
    )

    await userEvent.click(screen.getByLabelText('Item 2'))
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))

    expect(byId('r').data.items).toEqual(['One'])
  })

  it('is read-only while the block is being written', async () => {
    render(<Live id="sm" readOnly />)

    await userEvent.type(screen.getByLabelText('Summary'), 'x')

    expect(byId('sm').data.text).toBe('')
  })

  it('edits a chart title in place, even before it has data points', async () => {
    state().insertBlockAt(1, {
      id: 'c',
      type: 'chart',
      order: 9,
      data: { title: 'users', points: [], kind: 'line' },
    })
    render(<Live id="c" />)

    await userEvent.type(screen.getByLabelText('Chart title'), '!')

    expect(byId('c').data.title).toBe('users!')
  })

  it('edits a free text block: optional title, then text with bullets', async () => {
    state().insertBlockAt(1, { id: 'n', type: 'note', order: 9, data: { title: '', text: '' } })
    render(<Live id="n" />)

    await userEvent.type(screen.getByLabelText('Note title'), 'Decisions')
    await userEvent.type(screen.getByLabelText('Note text'), '- Ship Friday')

    expect(byId('n').data).toEqual({ title: 'Decisions', text: '- Ship Friday' })
  })

  describe('metrics', () => {
    beforeEach(() => {
      state().updateBlockData('kpi', {
        metrics: [
          { label: 'p95 latency', value: '180 ms' },
          { label: 'error rate', value: '0.3%' },
        ],
      })
    })

    it('removes the metric whose cross is pressed', async () => {
      render(<Live id="kpi" />)

      await userEvent.click(screen.getByRole('button', { name: 'Remove metric error rate' }))

      expect(byId('kpi').data.metrics).toEqual([{ label: 'p95 latency', value: '180 ms' }])
    })

    it('adds a blank metric from the plus tile and types into its value', async () => {
      render(<Live id="kpi" />)

      await userEvent.click(screen.getByRole('button', { name: 'Add metric' }))
      await userEvent.keyboard('99.9%')

      expect(byId('kpi').data.metrics).toEqual([
        { label: 'p95 latency', value: '180 ms' },
        { label: 'error rate', value: '0.3%' },
        { label: '', value: '99.9%' },
      ])
    })

    it('hides both controls while the model is writing', () => {
      render(<Live id="kpi" readOnly />)

      expect(screen.queryByRole('button', { name: 'Add metric' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Remove metric/ })).not.toBeInTheDocument()
    })
  })
})
