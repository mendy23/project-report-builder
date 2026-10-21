import { describe, expect, it } from 'vitest'

import { groupLines, type OcrLine } from '../../ingest/group'

function line(y: number, ...cells: [string, number][]): OcrLine {
  const words = cells.map(([text, x]) => ({
    text,
    bbox: { x0: x, y0: y, x1: x + 100, y1: y + 20 },
  }))
  return {
    text: cells.map(([text]) => text).join(' '),
    bbox: { x0: cells[0][1], y0: y, x1: cells[cells.length - 1][1] + 100, y1: y + 20 },
    words,
  }
}

describe('groupLines', () => {
  it('joins stacked cells of one card with commas', () => {
    const text = groupLines([
      line(0, ['Latency', 0], ['Errors', 400]),
      line(30, ['180ms', 0], ['0.3%', 400]),
      line(60, ['was320', 0], ['under0.5', 400]),
    ])

    expect(text).toBe('Latency, 180ms, was320\nErrors, 0.3%, under0.5')
  })

  it('keeps a distant row as its own group', () => {
    const text = groupLines([
      line(0, ['A', 0], ['B', 400]),
      line(30, ['a1', 0], ['b1', 400]),
      line(300, ['C', 0], ['D', 400]),
    ])

    expect(text).toBe('A, a1\nB, b1\nC\nD')
  })

  it('leaves plain text without side-by-side cells untouched', () => {
    const text = groupLines([line(0, ['Mei', 0]), line(30, ['Staging', 0])])

    expect(text).toBe('Mei\nStaging')
  })
})
