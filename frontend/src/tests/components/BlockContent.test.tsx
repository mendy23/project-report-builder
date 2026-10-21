import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BlockContent } from '../../components/BlockContent'
import type { Block } from '../../types'

const chartRenders = vi.hoisted(() => ({ count: 0 }))

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: () => {
      chartRenders.count++
      return null
    },
  }
})

const chart: Block = {
  id: 'c',
  type: 'chart',
  order: 0,
  data: { title: 'Velocity', kind: 'bar', points: [{ label: 'w1', value: '3' }] },
}

describe('BlockContent', () => {
  // every streamed token re-renders the canvas; recharts syncs its own store on each render,
  // and enough of those in one task trip React's "Maximum update depth exceeded"
  it('skips re-rendering a chart whose data did not change', () => {
    const { rerender } = render(<BlockContent block={chart} />)
    rerender(<BlockContent block={{ ...chart }} />)
    expect(chartRenders.count).toBe(1)
  })
})
