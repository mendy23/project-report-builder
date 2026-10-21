export const KPI_COLUMNS = 4

export const KPI_TILE_BG = '#eef0f3'

type Metric = { label: string; value: string }

// a tile spans as many columns as its text needs (bold value at 22px is about 16px a character,
// label at 12px about 7px, plus the tile's 24px padding; a column about 105px)
export const tileSpan = (m: Metric) =>
  Math.min(
    KPI_COLUMNS,
    Math.max(1, Math.ceil((Math.max(m.value.length * 16, m.label.length * 7) + 24) / 105)),
  )

// the same tiles in left-to-right rows of four columns, for exports that cannot use a CSS grid
export function packRows(metrics: Metric[]): { metric: Metric; span: number }[][] {
  const rows: { metric: Metric; span: number }[][] = []
  let used = KPI_COLUMNS
  for (const metric of metrics) {
    const span = tileSpan(metric)
    if (used + span > KPI_COLUMNS) {
      rows.push([])
      used = 0
    }
    rows[rows.length - 1].push({ metric, span })
    used += span
  }
  return rows
}
