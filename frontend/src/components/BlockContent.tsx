import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts'

import { CHART_COLORS, chartHeight, pieLegend, xAxis } from '../export/chartParts'
import { KPI_TILE_BG, tileSpan } from '../export/kpiGrid'
import { noteLines } from '../export/note'
import type { Block, ChartKind, Status } from '../types'
import { STATUS_TAG, COLOR } from '../export/tokens'

// recharts syncs its internal store on every render; streaming re-renders the whole card per
// token, and that many chart renders in one task trip React's update-depth limit
export const ChartPreview = memo(function ChartPreview({
  points,
  title,
  kind,
}: {
  points: { label: string; value: string }[]
  title: string
  kind: ChartKind
}) {
  const data = points.map((p) => ({
    ...p,
    num: parseFloat(p.value.replace(/[^0-9.-]/g, '')) || 0,
  }))
  return (
    <div style={{ width: '100%' }}>
      {title && (
        <p style={{ fontSize: 13, fontWeight: 600, color: COLOR.ink, marginBottom: 12 }}>{title}</p>
      )}
      <ResponsiveContainer width="100%" height={chartHeight(kind, points.length)}>
        {kind === 'line' ? (
          <LineChart data={data} margin={{ right: 24 }}>
            <XAxis {...xAxis(points.length)} />
            <YAxis tick={{ fontSize: 10, fill: COLOR.muted }} />
            <Line dataKey="num" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : kind === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey="num" nameKey="label" cx="30%" cy="50%" outerRadius={65}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            {pieLegend}
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ right: 24 }}>
            <XAxis {...xAxis(points.length)} />
            <YAxis tick={{ fontSize: 10, fill: COLOR.muted }} />
            <Bar dataKey="num">
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
})

// Tiles are packed into a four-column grid; a tile spans as many columns as its text needs
// (value at 22px is about 13px a character, label at 12px about 7px, a column about 90px),
// and dense flow back-fills the gaps so the group stays a tight rectangle.
export const KPI_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gridAutoFlow: 'dense',
  gap: '8px',
} as const

export const KPI_TILE = {
  background: KPI_TILE_BG,
  borderRadius: 10,
  padding: '10px 12px',
} as const

export function BlockContent({ block }: { block: Block }) {
  const { t } = useTranslation()
  const d = block.data
  switch (block.type) {
    case 'header':
      return (
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: COLOR.ink }}>
            {(d.project_name as string) || (
              <span style={{ color: COLOR.muted }}>{t('common.untitled')}</span>
            )}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: COLOR.muted }}>
            {[d.update_date, d.author].filter(Boolean).join(' · ')}
          </p>
        </div>
      )
    case 'status': {
      const tag = STATUS_TAG[d.tone as Status] ?? STATUS_TAG.on_track
      return (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span
            className="rounded-full px-3.5 py-1 font-semibold"
            style={{ background: tag.bg, color: tag.fg, fontSize: 14 }}
          >
            {d.label as string}
          </span>
        </div>
      )
    }
    case 'summary':
      return (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: COLOR.ink }}>
            {t('common.summary')}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: '20px',
              color: COLOR.ink,
              maxWidth: '52ch',
            }}
          >
            {(d.text as string) || ''}
          </p>
        </div>
      )
    case 'kpi': {
      const metrics = (d.metrics as { label: string; value: string }[]) ?? []
      return (
        <div style={KPI_GRID}>
          {metrics
            .filter((m) => m.label || m.value)
            .map((m, i) => (
              <div key={i} style={{ ...KPI_TILE, gridColumn: `span ${tileSpan(m)}` }}>
                <div
                  style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, whiteSpace: 'nowrap' }}
                >
                  {m.value}
                </div>
                <div style={{ fontSize: 12, color: COLOR.muted }}>{m.label}</div>
              </div>
            ))}
        </div>
      )
    }
    case 'chart': {
      const points = (d.points as { label: string; value: string }[]) ?? []
      const title = d.title as string
      const kind = (d.kind as ChartKind) ?? 'bar'
      if (points.length === 0) {
        return <p style={{ fontSize: 13, color: COLOR.muted }}>{title || '—'}</p>
      }
      return <ChartPreview points={points} title={title} kind={kind} />
    }
    case 'image': {
      const dataUrl = d.data_url as string
      const filename = d.filename as string
      if (dataUrl) {
        return <img src={dataUrl} alt={filename} style={{ maxWidth: '100%', borderRadius: 4 }} />
      }
      return <p style={{ fontSize: 13, color: COLOR.muted }}>{filename}</p>
    }
    case 'list': {
      const items = (d.items as string[]) ?? []
      const title = d.title as string
      return (
        <div>
          {title && (
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: COLOR.ink }}>
              {title}
            </p>
          )}
          <ul className="list-disc pl-4">
            {items.map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: COLOR.ink }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    case 'note': {
      const title = d.title as string
      return (
        <div>
          {title && (
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: COLOR.ink }}>
              {title}
            </p>
          )}
          {noteLines(d.text as string).map((line, i) =>
            line.bullet ? (
              <ul key={i} className="list-disc pl-4">
                <li style={{ fontSize: 13, color: COLOR.ink }}>{line.text}</li>
              </ul>
            ) : (
              <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: COLOR.ink }}>
                {line.text}
              </p>
            ),
          )}
        </div>
      )
    }
    default:
      return null
  }
}
