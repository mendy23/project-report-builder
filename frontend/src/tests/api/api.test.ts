import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateCard, streamBlock, streamDraft } from '../../api'
import type { BlockRequest } from '../../types'

const INPUT = { project_name: '', focus: '', text: 'notes', tables: [] }
const REQUEST: BlockRequest = {
  session_id: 's1',
  block: 'summary',
  add: [],
  exclude: [],
  current: 'Text.',
}

function mockSse(...chunks: string[]) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, body })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const sse = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`

afterEach(() => vi.unstubAllGlobals())

describe('streamBlock', () => {
  it('forwards partials in order and resolves with the done payload', async () => {
    const done = { value: 'Atlas done', warnings: [] }
    const fetchMock = mockSse(
      sse('partial', { value: 'Atlas' }),
      sse('partial', { value: 'Atlas done' }),
      sse('done', done),
    )
    const seen: unknown[] = []

    const result = await streamBlock(REQUEST, { onPartial: (p) => seen.push(p) })

    expect(seen).toEqual([{ value: 'Atlas' }, { value: 'Atlas done' }])
    expect(result).toEqual(done)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/block')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(REQUEST)
  })

  it('rejects with the message from an error event', async () => {
    mockSse(sse('error', { message: "This card's session expired; generate it again" }))

    await expect(streamBlock(REQUEST, { onPartial: () => {} })).rejects.toThrow('generate it again')
  })
})

describe('streamDraft', () => {
  it('forwards partial objects and resolves with the done payload', async () => {
    const done = { values: { title: 'Atlas' }, suggestions: {}, warnings: {}, failed: {} }
    const request = { session_id: 's1', blocks: ['title' as const], exclude: {} }
    const fetchMock = mockSse(sse('partial', { title: 'At' }), sse('done', done))
    const seen: unknown[] = []

    const result = await streamDraft(request, { onPartial: (p) => seen.push(p) })

    expect(seen).toEqual([{ title: 'At' }])
    expect(result).toEqual(done)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/draft')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(request)
  })
})

describe('generateCard', () => {
  it('returns the card, charts, pending map and session id', async () => {
    const body = { card: { id: 'c' }, charts: [], pending: { summary: 'b1' }, session_id: 's1' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }))

    expect(await generateCard(INPUT)).toEqual(body)
  })

  it('throws on a failed response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' }),
    )

    await expect(generateCard(INPUT)).rejects.toThrow('500')
  })
})
