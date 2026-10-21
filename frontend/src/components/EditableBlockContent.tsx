import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BlockContent, ChartPreview, KPI_GRID, KPI_TILE } from './BlockContent'
import { tileSpan } from '../export/kpiGrid'
import InlineText from './InlineText'
import NoteText from './NoteText'
import { COLOR, STATUS_TAG } from '../export/tokens'
import { useCardStore } from '../store'
import type { Block, ChartKind, Status } from '../types'

type Metric = { label: string; value: string }

function ListItems({
  items,
  readOnly,
  onChange,
}: {
  items: string[]
  readOnly?: boolean
  onChange: (items: string[]) => void
}) {
  const { t } = useTranslation()
  const list = useRef<HTMLUListElement>(null)
  const focusAt = useRef<number | null>(null)

  // runs after every render, so a focus requested by Enter or Backspace lands once the
  // list has its new items
  useEffect(() => {
    if (focusAt.current === null) return
    list.current?.querySelectorAll('textarea')[focusAt.current]?.focus()
    focusAt.current = null
  })

  const setItem = (i: number, text: string) => onChange(items.map((x, j) => (j === i ? text : x)))

  return (
    <ul ref={list} className="list-disc pl-4">
      {items.map((item, i) => (
        // the index is the identity: items are plain strings that can repeat
        <li
          key={i}
          style={{ fontSize: 13, color: COLOR.ink }}
          onBlur={() => item === '' && items.length > 1 && onChange(items.filter(Boolean))}
        >
          <InlineText
            label={t('blockEdit.item', { n: i + 1 })}
            value={item}
            readOnly={readOnly}
            // a block-level textarea leaves the li no line box, so the bullet marker vanishes
            style={{ display: 'inline-block', verticalAlign: 'top' }}
            onChange={(text) => setItem(i, text)}
            onEnter={() => {
              onChange([...items.slice(0, i + 1), '', ...items.slice(i + 1)])
              focusAt.current = i + 1
            }}
            onBackspaceEmpty={() => {
              if (items.length === 1) return
              onChange(items.filter((_, j) => j !== i))
              focusAt.current = Math.max(i - 1, 0)
            }}
          />
        </li>
      ))}
    </ul>
  )
}

export default function EditableBlockContent({
  block,
  readOnly,
}: {
  block: Block
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const update = useCardStore((s) => s.updateBlockData)
  const [newMetric, setNewMetric] = useState<number | null>(null)
  const d = block.data
  const set = (patch: Record<string, unknown>) => update(block.id, patch)

  switch (block.type) {
    case 'header':
      return (
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: COLOR.ink }}>
            <InlineText
              label={t('blockEdit.projectName')}
              placeholder={t('common.untitled')}
              value={d.project_name as string}
              readOnly={readOnly}
              onChange={(text) => set({ project_name: text })}
            />
          </h1>
          <div style={{ fontSize: 13, color: COLOR.muted }}>
            <span>{d.update_date as string}</span>
            <InlineText
              label={t('blockEdit.author')}
              placeholder={t('blockEdit.addAuthor')}
              value={d.author as string}
              readOnly={readOnly}
              onChange={(text) => set({ author: text })}
              style={{ width: 'auto', minWidth: '8ch' }}
            />
          </div>
        </div>
      )
    case 'status': {
      const tag = STATUS_TAG[d.tone as Status] ?? STATUS_TAG.on_track
      return (
        <div className="flex justify-end">
          <div className="rounded-full px-3.5 py-1" style={{ background: tag.bg, color: tag.fg }}>
            <InlineText
              label={t('blockEdit.status')}
              value={d.label as string}
              readOnly={readOnly}
              onChange={(text) => set({ label: text })}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: tag.fg,
                width: 'auto',
                minWidth: '4ch',
              }}
            />
          </div>
        </div>
      )
    }
    case 'summary':
      return (
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: COLOR.ink }}>
            {t('common.summary')}
          </h2>
          <InlineText
            label={t('blockEdit.summary')}
            value={d.text as string}
            readOnly={readOnly}
            onChange={(text) => set({ text })}
            style={{ fontSize: 14, lineHeight: '20px', color: COLOR.ink, maxWidth: '52ch' }}
          />
        </div>
      )
    case 'kpi': {
      const metrics = (d.metrics as Metric[]) ?? []
      const setMetric = (i: number, patch: Partial<Metric>) =>
        set({ metrics: metrics.map((m, j) => (j === i ? { ...m, ...patch } : m)) })
      const fit = { width: '100%' }
      return (
        <div style={KPI_GRID}>
          {metrics.map((m, i) => (
            <div
              key={i}
              className="group relative"
              style={{ ...KPI_TILE, gridColumn: `span ${tileSpan(m)}` }}
            >
              <InlineText
                label={t('blockEdit.metricValue', { n: i + 1 })}
                placeholder={t('blockEdit.valuePlaceholder')}
                value={m.value}
                readOnly={readOnly}
                autoFocus={i === newMetric}
                onChange={(value) => setMetric(i, { value })}
                style={{
                  ...fit,
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLOR.ink,
                  whiteSpace: 'nowrap',
                }}
              />
              <InlineText
                label={t('blockEdit.metricLabel', { n: i + 1 })}
                placeholder={t('blockEdit.labelPlaceholder')}
                value={m.label}
                readOnly={readOnly}
                onChange={(label) => setMetric(i, { label })}
                style={{ ...fit, fontSize: 12, color: COLOR.muted }}
              />
              {!readOnly && (
                <button
                  type="button"
                  aria-label={t('blockEdit.removeMetric', { name: m.label || m.value || i + 1 })}
                  onClick={(e) => {
                    e.stopPropagation()
                    set({ metrics: metrics.filter((_, j) => j !== i) })
                  }}
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-200 focus:opacity-100"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              aria-label={t('blockEdit.addMetric')}
              onClick={(e) => {
                e.stopPropagation()
                setNewMetric(metrics.length)
                set({ metrics: [...metrics, { label: '', value: '' }] })
              }}
              className="flex min-h-16 items-center justify-center rounded-[10px] border border-dashed border-slate-300 text-slate-500 hover:bg-slate-100"
              style={{ gridColumn: 'span 1' }}
            >
              <svg
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M8 3v10M3 8h10" />
              </svg>
            </button>
          )}
        </div>
      )
    }
    case 'note':
      return (
        <div>
          <InlineText
            label={t('blockEdit.noteTitle')}
            placeholder={t('blockEdit.addTitle')}
            value={d.title as string}
            readOnly={readOnly}
            onChange={(title) => set({ title })}
            style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: COLOR.ink }}
          />
          <NoteText value={d.text as string} onChange={(text) => set({ text })} />
        </div>
      )
    case 'list':
      return (
        <div>
          <InlineText
            label={t('blockEdit.listTitle')}
            value={d.title as string}
            readOnly={readOnly}
            onChange={(title) => set({ title })}
            style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: COLOR.ink }}
          />
          <ListItems
            items={(d.items as string[]) ?? []}
            readOnly={readOnly}
            onChange={(items) => set({ items })}
          />
        </div>
      )
    case 'chart': {
      const points = (d.points as { label: string; value: string }[]) ?? []
      return (
        <div>
          <InlineText
            label={t('blockEdit.chartTitle')}
            value={d.title as string}
            readOnly={readOnly}
            onChange={(title) => set({ title })}
            style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: COLOR.ink }}
          />
          {points.length > 0 && (
            <ChartPreview points={points} title="" kind={(d.kind as ChartKind) ?? 'bar'} />
          )}
        </div>
      )
    }
    default:
      return <BlockContent block={block} />
  }
}
