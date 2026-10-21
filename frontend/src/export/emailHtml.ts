import { KPI_TILE_BG, packRows } from './kpiGrid'
import { noteLines } from './note'
import i18n from '../i18n'
import type { Card, Block, ChartKind } from '../types'
import { rasterizeChart } from './chartRasterizer'
import { CARD_WIDTH_PX, COLOR, FONT_STACK, STATUS_COLOR, STATUS_TAG } from './tokens'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function layoutTable(extraStyle = ''): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${extraStyle}">`
}

type Data = Block['data']

function renderHeader(d: Data): string {
  return (
    `<h1 style="margin:0 0 2px;font-size:20px;line-height:26px;letter-spacing:-0.02em;color:${COLOR.ink}">` +
    `${escapeHtml(d.project_name as string)}</h1>` +
    `<p style="margin:0;font-size:13px;line-height:18px;color:${COLOR.muted}">` +
    `${escapeHtml([d.update_date, d.author].filter(Boolean).join(' · '))}</p>`
  )
}

function renderKpi(d: Data): string {
  const metrics = (d.metrics as { label: string; value: string }[]) ?? []
  const rows = packRows(metrics.filter((m) => m.label || m.value))
    .map((row) => {
      const cells = row
        .map(
          ({ metric, span }) =>
            `<td colspan="${span}" style="width:${span * 25}%;padding:0 8px 8px 0;vertical-align:top;word-break:break-word">` +
            `<div style="background:${KPI_TILE_BG};border-radius:10px;padding:10px 12px">` +
            `<div style="font-size:22px;line-height:28px;font-weight:600;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap;color:${COLOR.ink}">` +
            `${escapeHtml(metric.value)}</div>` +
            `<div style="font-size:12px;line-height:16px;color:${COLOR.muted}">` +
            `${escapeHtml(metric.label)}</div></div></td>`,
        )
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')
  return `${layoutTable('width:100%;table-layout:fixed')}${rows}</table>`
}

function renderStatus(d: Data): string {
  const tag = STATUS_TAG[d.tone as keyof typeof STATUS_TAG] ?? STATUS_TAG.on_track
  return (
    `<span style="display:inline-block;white-space:nowrap;background:${tag.bg};color:${tag.fg};` +
    `border-radius:999px;padding:4px 14px;font-size:14px;font-weight:600;line-height:20px">` +
    `${escapeHtml(d.label as string)}</span>`
  )
}

function renderSummary(d: Data): string {
  return (
    `<p style="margin:0 0 4px;font-size:13px;font-weight:600;line-height:18px;color:${COLOR.ink}">` +
    `${i18n.t('common.summary')}</p>` +
    `<p style="margin:0;font-size:14px;line-height:20px;color:${COLOR.ink};` +
    `max-width:52ch">${escapeHtml(d.text as string)}</p>`
  )
}

function renderChartFallback(d: Data): string {
  const points = (d.points as { label: string; value: string }[]) ?? []
  const rows = points
    .map(
      (p) =>
        `<tr>` +
        `<td style="padding:2px 12px 2px 0;font-size:13px;line-height:18px;color:${COLOR.muted}">` +
        `${escapeHtml(p.label)}</td>` +
        `<td style="padding:2px 0;font-size:13px;line-height:18px;color:${COLOR.ink};` +
        `font-variant-numeric:tabular-nums">${escapeHtml(p.value)}</td>` +
        `</tr>`,
    )
    .join('')
  return (
    `${layoutTable('width:100%')}` +
    `<caption style="text-align:left;font-size:13px;line-height:18px;` +
    `color:${COLOR.muted};padding:0 0 4px">${escapeHtml(d.title as string)}</caption>` +
    `${rows}</table>`
  )
}

function renderImage(d: Data): string {
  const dataUrl = d.data_url as string
  const filename = d.filename as string
  if (dataUrl) {
    return (
      `<img src="${escapeHtml(dataUrl)}" alt="${escapeHtml(filename)}" ` +
      `style="max-width:100%;border-radius:4px;display:block" />`
    )
  }
  return (
    `<p style="margin:0;font-size:13px;line-height:18px;color:${COLOR.muted}">` +
    `${escapeHtml(filename)} — ${i18n.t('exportText.attached')}</p>`
  )
}

function renderList(d: Data): string {
  const items = (d.items as string[]) ?? []
  const lis = items
    .map(
      (item) =>
        `<li style="margin:0 0 2px;font-size:13px;line-height:18px;color:${COLOR.ink}">` +
        `${escapeHtml(item)}</li>`,
    )
    .join('')
  return (
    `<p style="margin:0 0 4px;font-size:13px;font-weight:600;line-height:18px;color:${COLOR.ink}">` +
    `${escapeHtml(d.title as string)}</p>` +
    `<ul style="margin:0;padding:0 0 0 16px;list-style:disc">${lis}</ul>`
  )
}

function renderNote(d: Data): string {
  const title = d.title as string
  const body = noteLines(d.text as string)
    .map((line) =>
      line.bullet
        ? `<ul style="margin:0;padding:0 0 0 16px;list-style:disc"><li style="font-size:13px;line-height:18px;color:${COLOR.ink}">${escapeHtml(line.text)}</li></ul>`
        : `<p style="margin:0;font-size:14px;line-height:20px;color:${COLOR.ink}">${escapeHtml(line.text)}</p>`,
    )
    .join('')
  const heading = title
    ? `<p style="margin:0 0 4px;font-size:13px;font-weight:600;line-height:18px;color:${COLOR.ink}">${escapeHtml(title)}</p>`
    : ''
  return heading + body
}

async function renderBlock(block: Block): Promise<string> {
  const d = block.data
  switch (block.type) {
    case 'header':
      return renderHeader(d)
    case 'status':
      return renderStatus(d)
    case 'summary':
      return renderSummary(d)
    case 'kpi':
      return renderKpi(d)
    case 'chart': {
      const title = (d.title as string) ?? ''
      const png = await rasterizeChart(
        (d.kind as ChartKind) ?? 'bar',
        (d.points as { label: string; value: string }[]) ?? [],
        title,
      )
      return png
        ? `<img src="${escapeHtml(png)}" alt="${escapeHtml(title)}" style="max-width:100%;border-radius:4px;display:block" />`
        : renderChartFallback(d)
    }
    case 'image':
      return renderImage(d)
    case 'list':
      return renderList(d)
    case 'note':
      return renderNote(d)
  }
}

export async function renderEmailHtml(card: Card): Promise<string> {
  const sorted = [...card.blocks].sort((a, b) => a.order - b.order)
  const html = await Promise.all(sorted.map(renderBlock))
  const statusAt = sorted.findIndex(
    (b, i) => b.type === 'status' && sorted[i - 1]?.type === 'header',
  )
  if (statusAt > 0) {
    html[statusAt - 1] =
      `${layoutTable('width:100%')}<tr><td style="vertical-align:top">${html[statusAt - 1]}</td>` +
      `<td style="vertical-align:top;text-align:right;padding-left:12px">${html[statusAt]}</td></tr></table>`
    html.splice(statusAt, 1)
  }
  const rows = html.map((cell) => `<tr><td style="padding:0 0 14px">${cell}</td></tr>`).join('')

  const frame = `width:${CARD_WIDTH_PX}px;max-width:${CARD_WIDTH_PX}px;background:${COLOR.surface};border-left:4px solid ${STATUS_COLOR[card.status]};font-family:${FONT_STACK};color:${COLOR.ink}`

  return (
    `${layoutTable(frame)}<tr><td style="padding:20px 24px 6px">` +
    `${layoutTable('width:100%;table-layout:fixed')}${rows}</table>` +
    `</td></tr></table>`
  )
}
