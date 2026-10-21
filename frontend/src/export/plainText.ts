import i18n from '../i18n'
import { noteLines } from './note'
import type { Block, Card } from '../types'

type Data = Block['data']

function renderHeader(d: Data): string {
  return [d.project_name as string, [d.update_date, d.author].filter(Boolean).join(' · ')]
    .filter(Boolean)
    .join('\n')
}

function renderKpi(d: Data): string {
  const metrics = (d.metrics as { label: string; value: string }[]) ?? []
  return metrics
    .filter((m) => m.label || m.value)
    .map((m) => `${m.label}: ${m.value}`)
    .join('\n')
}

function renderStatus(d: Data): string {
  return d.label as string
}

function renderSummary(d: Data): string {
  return `${i18n.t('common.summary')}\n${d.text as string}`
}

function renderChart(d: Data): string {
  const points = (d.points as { label: string; value: string }[]) ?? []
  return `${d.title as string}\n${points.map((p) => `${p.label}: ${p.value}`).join('\n')}`
}

function renderImage(d: Data): string {
  return `${d.filename as string} — ${i18n.t('exportText.attachedSeparately')}`
}

function renderList(d: Data): string {
  const items = (d.items as string[]) ?? []
  return `${d.title as string}\n${items.map((item) => `- ${item}`).join('\n')}`
}

function renderNote(d: Data): string {
  const body = noteLines(d.text as string)
    .map((line) => (line.bullet ? `- ${line.text}` : line.text))
    .join('\n')
  return [d.title as string, body].filter(Boolean).join('\n')
}

const RENDERERS: Partial<Record<Block['type'], (d: Data) => string>> = {
  header: renderHeader,
  status: renderStatus,
  summary: renderSummary,
  kpi: renderKpi,
  chart: renderChart,
  image: renderImage,
  list: renderList,
  note: renderNote,
}

export function renderPlainText(card: Card): string {
  const sections = [...card.blocks]
    .sort((a, b) => a.order - b.order)
    .map((block) => RENDERERS[block.type]?.(block.data) ?? '')
    .filter((text) => text !== '')

  return sections.join('\n\n')
}
