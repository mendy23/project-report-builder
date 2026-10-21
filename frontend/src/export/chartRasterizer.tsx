import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis } from 'recharts'
import { toPng } from 'html-to-image'
import { createRoot } from 'react-dom/client'
import type { ChartKind, ChartPoint } from '../types'
import { CHART_COLORS, chartHeight, pieLegend, xAxis } from './chartParts'
import { COLOR } from './tokens'

// fixed size: ResponsiveContainer renders nothing inside the zero-sized off-screen div
const CHART_W = 460

function toNumeric(p: ChartPoint): { label: string; value: number } {
  return {
    label: p.label,
    value: parseFloat(p.value.replace(/[^0-9.-]/g, '')) || 0,
  }
}

function ChartSvg({
  kind,
  points,
  title,
}: {
  kind: ChartKind
  points: ChartPoint[]
  title: string
}) {
  const data = points.map(toNumeric)
  const height = chartHeight(kind, points.length)

  return (
    <div
      style={{ width: CHART_W, padding: 12, background: COLOR.surface, fontFamily: 'sans-serif' }}
    >
      {title && (
        <p style={{ fontSize: 13, fontWeight: 600, color: COLOR.ink, margin: '0 0 12px' }}>
          {title}
        </p>
      )}
      {kind === 'line' ? (
        <LineChart data={data} width={CHART_W - 24} height={height} margin={{ right: 24 }}>
          <XAxis {...xAxis(points.length)} />
          <YAxis tick={{ fontSize: 10, fill: COLOR.muted }} />
          <Line
            isAnimationActive={false}
            dataKey="value"
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      ) : kind === 'pie' ? (
        <PieChart width={CHART_W - 24} height={height}>
          <Pie
            isAnimationActive={false}
            data={data}
            dataKey="value"
            nameKey="label"
            cx="30%"
            cy="50%"
            outerRadius={65}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          {pieLegend}
        </PieChart>
      ) : (
        <BarChart data={data} width={CHART_W - 24} height={height} margin={{ right: 24 }}>
          <XAxis {...xAxis(points.length)} />
          <YAxis tick={{ fontSize: 10, fill: COLOR.muted }} />
          <Bar isAnimationActive={false} dataKey="value">
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      )}
    </div>
  )
}

// charts are drawn at the same off-screen spot, so two at once spoil each other
let queue: Promise<unknown> = Promise.resolve()

// resolves null when rasterizing fails (jsdom), so callers can fall back
export function rasterizeChart(kind: ChartKind, points: ChartPoint[], title: string) {
  const next = queue.then(() => drawChart(kind, points, title))
  queue = next
  return next
}

async function drawChart(
  kind: ChartKind,
  points: ChartPoint[],
  title: string,
): Promise<string | null> {
  if (points.length === 0) return null

  // Off-screen but NOT zero-sized — recharts needs real pixel dimensions.
  // Position at top-left behind a clip so the user never sees it flash.
  const clip = document.createElement('div')
  clip.style.cssText =
    'position:fixed;top:0;left:0;overflow:hidden;z-index:-1;pointer-events:none;opacity:0'

  const container = document.createElement('div')
  container.style.cssText = `width:${CHART_W}px;height:${chartHeight(kind, points.length) + 40}px`
  clip.appendChild(container)
  document.body.appendChild(clip)

  try {
    const root = createRoot(container)
    await new Promise<void>((resolve) => {
      root.render(<ChartSvg kind={kind} points={points} title={title} />)
      // One rAF for React commit, one for recharts to paint SVG nodes
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    // same WebKit first-draw blank as in png.ts
    await toPng(container, { pixelRatio: 2 })
    const dataUrl = await toPng(container, { pixelRatio: 2 })
    root.unmount()
    return dataUrl
  } catch {
    return null
  } finally {
    clip.remove()
  }
}
