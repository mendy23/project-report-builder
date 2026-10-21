import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import KeywordPanel from './KeywordPanel'
import PanelToggle from './PanelToggle'
import { availableCount } from '../store/blockDefaults'
import { useCardStore } from '../store'
import type { BlockField, BlockType, Status } from '../types'
import { addGenerated } from '../llm/run'
import { STATUS_TAG } from '../export/tokens'

// the blocks that mean something: four the model writes, a chart from the parsed data, and a
// free text block. Header and status are always on the card.
const ENTRIES: { key: string; type: BlockType; field?: BlockField; label: string }[] = [
  { key: 'summary', type: 'summary', field: 'summary', label: 'palette.blockSummary' },
  { key: 'kpi', type: 'kpi', field: 'kpi', label: 'palette.blockKpi' },
  { key: 'risks', type: 'list', field: 'risks', label: 'palette.blockRisks' },
  { key: 'next_steps', type: 'list', field: 'next_steps', label: 'palette.blockNextSteps' },
  { key: 'chart', type: 'chart', label: 'palette.blockChart' },
  { key: 'note', type: 'note', label: 'palette.blockNote' },
]

const STATUSES: Status[] = ['on_track', 'at_risk', 'blocked']

const HEADING = 'mt-5 px-1 text-xs font-semibold tracking-wide text-slate-600 uppercase'

function DataItem({
  type,
  data,
  onAdd,
  disabled = false,
  children,
}: {
  type: BlockType
  data: Record<string, unknown>
  onAdd: (type: BlockType, data: Record<string, unknown>) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <li>
      <button
        draggable={!disabled}
        disabled={disabled}
        onDragStart={(e) =>
          e.dataTransfer.setData('application/x-block-data', JSON.stringify({ type, data }))
        }
        onClick={() => onAdd(type, data)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-default"
      >
        {children}
      </button>
    </li>
  )
}

export default function BlockPalette({
  hidden,
  onCollapse,
}: {
  hidden: boolean
  onCollapse: () => void
}) {
  const { t } = useTranslation()
  const card = useCardStore((s) => s.card)
  const charts = useCardStore((s) => s.charts)
  const addBlock = useCardStore((s) => s.addBlock)
  const setCardStatus = useCardStore((s) => s.setCardStatus)
  const images = useCardStore((s) => s.images)

  const [chartsOpen, setChartsOpen] = useState(false)
  const pending = useCardStore((s) => s.llm.pending)
  const selectBlock = useCardStore((s) => s.selectBlock)
  const noContent = useCardStore((s) => s.llm.noContent)

  const blockTypes = card?.blocks.map((b) => b.type) ?? []
  const hasBlock = (id?: string) => !!id && !!card?.blocks.some((b) => b.id === id)

  return (
    <nav
      hidden={hidden}
      aria-label={t('palette.navLabel')}
      className="w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="px-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          {t('palette.statusTags')}
        </h2>
        <PanelToggle open onToggle={onCollapse} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {STATUSES.map((status) => {
          const active = card?.status === status
          return (
            <button
              key={status}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-status', status)
              }}
              onClick={() => setCardStatus(status)}
              aria-pressed={active}
              className="rounded-full px-3.5 py-1 text-xs font-semibold"
              style={{
                background: STATUS_TAG[status].bg,
                color: STATUS_TAG[status].fg,
                boxShadow: active ? `inset 0 0 0 2px ${STATUS_TAG[status].fg}` : 'none',
              }}
            >
              {t(`status.${status}`)}
            </button>
          )
        })}
      </div>

      <h2 className="mt-5 px-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
        {t('palette.navLabel')}
      </h2>
      <p className="mt-1 px-1 text-xs text-slate-500">{t('palette.dragHint')}</p>
      <ul className="mt-2 space-y-0.5">
        {ENTRIES.map(({ key, type, field, label: labelKey }) => {
          const free = key === 'note'
          const used = field ? hasBlock(pending[field]) : !free && blockTypes.includes(type)
          const found = availableCount(type, charts)
          const label = t(labelKey)
          // a block whose first draft was empty, or a chart with no data, has nothing to add
          const disabled =
            !used && (field ? noContent.includes(field) : type === 'chart' && found === 0)
          const state = disabled
            ? t('palette.stateNothing')
            : free
              ? t('palette.stateBlank')
              : used
                ? t('palette.stateInCard')
                : found > 0
                  ? t('palette.stateFound', { count: found })
                  : field
                    ? t('palette.stateWrite')
                    : t('palette.stateNothing')
          const add = () => {
            if (!field) addBlock(type)
            else if (used) selectBlock(pending[field])
            else void addGenerated(field)
          }

          if (key === 'chart') {
            const onCard = new Set(
              card?.blocks.filter((b) => b.type === 'chart').map((b) => b.data.title),
            )
            return (
              <li key={key}>
                <button
                  disabled={disabled}
                  aria-expanded={chartsOpen}
                  onClick={() => setChartsOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <span className={disabled ? 'text-slate-400' : 'text-slate-900'}>{label}</span>
                  <span className="text-xs text-slate-600">
                    {disabled
                      ? '—'
                      : `${charts.filter((c) => onCard.has(c.title)).length}/${charts.length} ${chartsOpen ? '▴' : '▾'}`}
                  </span>
                </button>
                {chartsOpen && !disabled && (
                  <ul className="mt-0.5 mb-1 space-y-0.5 pl-3">
                    {charts.map((chart) => (
                      <DataItem
                        key={chart.title}
                        type="chart"
                        data={{ ...chart }}
                        onAdd={addBlock}
                        disabled={onCard.has(chart.title)}
                      >
                        <span className="text-slate-900">{chart.title}</span>
                        <span className="text-xs text-slate-500">
                          {onCard.has(chart.title) ? '✓' : `${chart.kind} · ${chart.points.length}`}
                        </span>
                      </DataItem>
                    ))}
                  </ul>
                )}
              </li>
            )
          }

          return (
            <li key={key}>
              <button
                draggable={!disabled}
                disabled={disabled}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-block-type', key)
                }}
                onClick={add}
                aria-label={t('palette.addAria', { label, state })}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <span
                  className={
                    !disabled && (found > 0 || used || free || field)
                      ? 'text-slate-900'
                      : 'text-slate-400'
                  }
                >
                  {label}
                </span>
                <span className="text-xs text-slate-600">
                  {disabled ? '—' : free ? '+' : used ? '✓' : found > 0 ? found : field ? '+' : '—'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {images.length > 0 && (
        <>
          <h2 className={HEADING}>{t('palette.images')}</h2>
          <ul className="mt-2 space-y-1">
            {images.map((img) => (
              <DataItem
                key={img.id}
                type="image"
                data={{ filename: img.filename, data_url: img.data_url }}
                onAdd={addBlock}
              >
                <img
                  src={img.data_url}
                  alt={img.filename}
                  className="size-8 rounded border border-slate-200 object-cover"
                />
                <span className="truncate text-slate-900">{img.filename}</span>
              </DataItem>
            ))}
          </ul>
        </>
      )}

      <KeywordPanel />
    </nav>
  )
}
