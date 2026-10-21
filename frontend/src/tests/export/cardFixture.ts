import type { Block, BlockType, Card } from '../../types'

export const EXAMPLE_DATA: Record<BlockType, Record<string, unknown>> = {
  header: { project_name: 'Atlas Migration', update_date: '17 October 2026', author: 'Mendy Wong' },
  status: { label: 'Shipping on schedule', tone: 'on_track' },
  summary: { text: 'Phase 2 of the Atlas migration finished a day early.' },
  kpi: { metrics: [{ label: 'p95 latency', value: '180 ms' }] },
  chart: { title: 'Sprint velocity', points: [{ label: 'Sprint 1', value: '32' }], kind: 'bar' },
  image: { filename: 'dashboard.png', data_url: 'data:image/png;base64,iVBORw0KGgo=' },
  list: { title: 'Risks', items: ['Vendor API contract is unsigned.'] },
  note: { title: 'Decisions', text: '- Ship Friday\nDemo is booked' },
}

export const MUST_APPEAR: Record<BlockType, string> = {
  header: 'Atlas Migration',
  status: 'Shipping on schedule',
  summary: 'finished a day early',
  kpi: '180 ms',
  chart: 'Sprint velocity',
  image: 'dashboard.png',
  list: 'Vendor API contract',
  note: 'Ship Friday',
}

export const ALL_TYPES = Object.keys(EXAMPLE_DATA) as BlockType[]

export function block(type: BlockType, order: number): Block {
  return {
    id: `b-${type}`,
    type,
    order,
    data: EXAMPLE_DATA[type],
  }
}

export function fixtureCard(): Card {
  return {
    id: 'c1',
    project_name: 'Atlas Migration',
    status: 'on_track',
    blocks: ALL_TYPES.map((type, i) => block(type, i)),
    created_at: '2026-10-17T12:00:00Z',
  }
}
