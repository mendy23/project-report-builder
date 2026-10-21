import { Legend } from 'recharts'

import { COLOR } from './tokens'

export const CHART_COLORS = ['#4f46e5', '#1d7a4b', '#8a6400', '#a3252b', '#6e6e73', '#2d6cac']

// every category label is shown: ticks are never skipped, and a label breaks into rows at its
// spaces, hyphens and underscores instead of being cut
function WrappedTick({
  x,
  y,
  payload,
  slanted,
}: {
  x?: number
  y?: number
  payload?: { value: string }
  slanted?: boolean
}) {
  const value = String(payload?.value ?? '')
  // with many categories there is no room side by side, so the whole label is turned instead
  if (slanted) {
    return (
      <text
        x={x}
        y={(y ?? 0) + 8}
        textAnchor="end"
        fontSize={10}
        fill={COLOR.muted}
        transform={`rotate(-45 ${x} ${(y ?? 0) + 8})`}
      >
        {value}
      </text>
    )
  }
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={10} fill={COLOR.muted}>
      {value.split(/[\s_-]+/).map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 10 : 12}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

export const MANY_CATEGORIES = 8

export const xAxis = (count: number) =>
  ({
    dataKey: 'label',
    interval: 0,
    height: count > MANY_CATEGORIES ? 80 : 44,
    tick: <WrappedTick slanted={count > MANY_CATEGORIES} />,
  }) as const

export const chartHeight = (kind: string, count: number) =>
  kind === 'pie' || count > MANY_CATEGORIES ? 200 : 150

export const pieLegend = (
  <Legend
    position="right"
    iconSize={8}
    formatter={(name) => <span style={{ fontSize: 11, color: COLOR.muted }}>{name}</span>}
  />
)
