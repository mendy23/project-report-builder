import { STATUS_TAG, statusLabel } from '../export/tokens'
import type { BlockField, Card } from '../types'

const LIST_FIELDS: BlockField[] = ['risks', 'next_steps']

// the header and status blocks stay on the card even when the model leaves them blank
export const REMOVABLE: BlockField[] = ['summary', 'kpi', ...LIST_FIELDS]

export function isEmptyValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() === ''
  return Array.isArray(value) && value.length === 0
}

function setData(card: Card, id: string | undefined, data: Record<string, unknown>): Card {
  const blocks = card.blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...data } } : b))
  return { ...card, blocks }
}

export function applyValue(
  card: Card,
  pending: Record<string, string>,
  field: BlockField,
  value: unknown,
): Card {
  const id = pending[field]
  if (field === 'title') {
    return { ...setData(card, id, { project_name: value }), project_name: value as string }
  }
  if (field === 'status') {
    const status = value as keyof typeof STATUS_TAG
    if (!(status in STATUS_TAG)) return card
    return {
      ...setData(card, id, { label: statusLabel(status), tone: status }),
      status,
    }
  }
  if (field === 'summary') return setData(card, id, { text: value })
  if (field === 'kpi') {
    // a row still being written has no value yet
    const rows = (value as Record<string, unknown>[]).filter(
      (row) => typeof row.label === 'string' && typeof row.value === 'string',
    )
    return setData(card, id, { metrics: rows })
  }
  return setData(card, id, { items: value })
}

export function currentValue(
  card: Card,
  pending: Record<string, string>,
  field: BlockField,
): unknown {
  const block = card.blocks.find((b) => b.id === pending[field])
  if (!block) return null
  if (field === 'title') return block.data.project_name
  if (field === 'status') return block.data.tone
  if (field === 'summary') return block.data.text
  if (field === 'kpi') return block.data.metrics
  return block.data.items
}

export function removeEmptyBlock(
  card: Card,
  pending: Record<string, string>,
  field: BlockField,
): Card {
  const blocks = card.blocks
    .filter((b) => b.id !== pending[field])
    .map((b, order) => ({ ...b, order }))
  return { ...card, blocks }
}
