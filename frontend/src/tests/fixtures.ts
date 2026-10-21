import type { Block, BlockType, Card } from '../types'

export const PENDING = {
  title: 'h',
  status: 'st',
  summary: 'sm',
  kpi: 'kpi',
  risks: 'r',
  next_steps: 'ns',
}

function block(id: string, type: BlockType, order: number, data: Record<string, unknown>): Block {
  return { id, type, order, data }
}

export function placeholderCard(): Card {
  return {
    id: 'card-1',
    project_name: '',
    status: 'on_track',
    created_at: '2026-10-18T00:00:00Z',
    blocks: [
      block('h', 'header', 0, { project_name: '', update_date: '2026-10-18', author: '' }),
      block('st', 'status', 1, { label: 'On track', tone: 'on_track' }),
      block('sm', 'summary', 2, { text: '' }),
      block('kpi', 'kpi', 3, { metrics: [] }),
      block('r', 'list', 4, { title: 'Risks', items: [] }),
      block('ns', 'list', 5, { title: 'Next steps', items: [] }),
    ],
  }
}
