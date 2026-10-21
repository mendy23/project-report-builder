import i18n from './i18n'
import type { BlockDone, BlockRequest, Card, ChartSeries, DraftDone, DraftRequest } from './types'

export interface GenerateResponse {
  card: Card
  charts: ChartSeries[]
  pending: Record<string, string>
  session_id: string
}

export interface GenerateInput {
  project_name: string
  focus: string
  text: string
  tables: string[]
}

async function postJson(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    throw new Error(
      i18n.t('errors.requestFailed', {
        url,
        status: response.status,
        statusText: response.statusText,
      }),
    )
  }
  return response
}

// resolves with the payload of the first event onEvent does not claim (the done event)
/* eslint-disable @typescript-eslint/no-explicit-any -- raw SSE JSON, each caller asserts its own shape */
async function readEvents(
  response: Response,
  onEvent: (name: string, data: any) => boolean,
): Promise<any> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!response.body) throw new Error(i18n.t('errors.noBody'))
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += value
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) {
      const [nameLine, dataLine] = event.split('\n')
      const name = nameLine.replace('event: ', '')
      const data = JSON.parse(dataLine.replace('data: ', ''))
      if (name === 'error') throw new Error(data.message)
      if (!onEvent(name, data)) return data
    }
  }
  throw new Error(i18n.t('errors.streamEnded'))
}

export async function generateCard(input: GenerateInput): Promise<GenerateResponse> {
  const response = await postJson('/api/generate', input)
  return (await response.json()) as GenerateResponse
}

export async function streamBlock(
  request: BlockRequest,
  handlers: { onPartial: (partial: { value?: unknown }) => void },
  signal?: AbortSignal,
): Promise<BlockDone> {
  const response = await postJson('/api/block', request, signal)
  return readEvents(response, (name, data) => {
    if (name !== 'partial') return false
    handlers.onPartial(data)
    return true
  })
}

export async function streamDraft(
  request: DraftRequest,
  handlers: { onPartial: (partial: DraftDone['values']) => void },
  signal?: AbortSignal,
): Promise<DraftDone> {
  const response = await postJson('/api/draft', request, signal)
  return readEvents(response, (name, data) => {
    if (name !== 'partial') return false
    handlers.onPartial(data)
    return true
  })
}
