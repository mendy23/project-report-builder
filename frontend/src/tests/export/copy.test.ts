import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { copyCard } from '../../export/copy'
import { fixtureCard } from './cardFixture'

vi.mock('../../export/png', () => ({
  renderPng: vi.fn().mockResolvedValue(new Blob(['png-bytes'], { type: 'image/png' })),
}))

vi.mock('../../export/chartRasterizer', () => ({
  rasterizeChart: vi.fn().mockResolvedValue(null),
}))

function stubClipboard(): ReturnType<typeof vi.fn>
function stubClipboard(impl: (items: ClipboardItem[]) => Promise<void>): ReturnType<typeof vi.fn>
function stubClipboard(impl?: (items: ClipboardItem[]) => Promise<void>): ReturnType<typeof vi.fn> {
  const write = impl ? vi.fn(impl) : vi.fn().mockResolvedValue(undefined)
  const clipboard = { write }
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
    writable: true,
  })
  return write
}

class TestClipboardItem {
  items: Record<string, Promise<Blob>>
  constructor(items: Record<string, Promise<Blob>>) {
    this.items = items
  }
}

describe('copyCard', () => {
  beforeEach(() => {
    globalThis.ClipboardItem = TestClipboardItem as unknown as typeof ClipboardItem
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('html format writes exactly one ClipboardItem, type text/html', async () => {
    const write = stubClipboard()

    await copyCard(fixtureCard(), 'html')

    expect(write).toHaveBeenCalledTimes(1)
    const item = write.mock.calls[0][0][0] as unknown as TestClipboardItem
    expect(item.items).toHaveProperty('text/html')
    expect(Object.keys(item.items)).toHaveLength(1)
  })

  it('png format writes exactly one ClipboardItem, type image/png', async () => {
    const write = stubClipboard()

    await copyCard(fixtureCard(), 'png')

    expect(write).toHaveBeenCalledTimes(1)
    const item = write.mock.calls[0][0][0] as unknown as TestClipboardItem
    expect(item.items).toHaveProperty('image/png')
    expect(Object.keys(item.items)).toHaveLength(1)
  })

  it('text format writes exactly one ClipboardItem, type text/plain', async () => {
    const write = stubClipboard()

    await copyCard(fixtureCard(), 'text')

    expect(write).toHaveBeenCalledTimes(1)
    const item = write.mock.calls[0][0][0] as unknown as TestClipboardItem
    expect(item.items).toHaveProperty('text/plain')
    expect(Object.keys(item.items)).toHaveLength(1)
  })

  it('ClipboardItem is constructed with a Promise value', async () => {
    const write = stubClipboard()

    await copyCard(fixtureCard(), 'text')

    const item = write.mock.calls[0][0][0] as unknown as TestClipboardItem
    const value = item.items['text/plain']
    expect(value).toBeInstanceOf(Promise)
    const blob = await value
    expect(blob).toBeInstanceOf(Blob)
  })

  it('a rejected clipboard write propagates', async () => {
    const write = stubClipboard(() => Promise.reject(new Error('denied')))

    await expect(copyCard(fixtureCard(), 'text')).rejects.toThrow('denied')
    expect(write).toHaveBeenCalledTimes(1)
  })
})
