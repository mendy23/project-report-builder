import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fixtureCard } from './cardFixture'
import { renderPng } from '../../export/png'

const toPng = vi.fn()
vi.mock('html-to-image', () => ({ toPng: (...args: unknown[]) => toPng(...args) }))

vi.mock('../../export/chartRasterizer', () => ({
  rasterizeChart: vi.fn().mockResolvedValue(null),
}))

function totalLeftOffset(node: HTMLElement): number {
  let offset = 0
  for (let el: HTMLElement | null = node; el; el = el.parentElement) {
    offset += Number.parseFloat(el.style.left || '0') || 0
  }
  return offset
}

describe('renderPng', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toPng.mockResolvedValue('data:image/png;base64,iVBORw0KGgo=')
  })

  it('renders the node at the origin, never shifted off-screen', async () => {
    await renderPng(fixtureCard())

    const node = toPng.mock.calls[0][0] as HTMLElement
    expect(totalLeftOffset(node)).toBeGreaterThanOrEqual(0)
  })

  it('returns a PNG blob matching the data URL bytes', async () => {
    const blob = await renderPng(fixtureCard())

    expect(blob.type).toBe('image/png')
    // The fixture is `iVBORw0KGgo=` (the 8-byte PNG signature followed by
    // `\n`). Check the first byte matches the PNG magic number 0x89.
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(bytes[0]).toBe(0x89)
    expect(blob.size).toBe(8)
  })

  it('removes its scratch nodes from the document', async () => {
    const before = document.body.childElementCount

    await renderPng(fixtureCard())

    expect(document.body.childElementCount).toBe(before)
  })

  it('cleans up even when rasterising throws', async () => {
    const before = document.body.childElementCount
    toPng.mockRejectedValue(new Error('canvas tainted'))

    await expect(renderPng(fixtureCard())).rejects.toThrow('canvas tainted')
    expect(document.body.childElementCount).toBe(before)
  })
})
