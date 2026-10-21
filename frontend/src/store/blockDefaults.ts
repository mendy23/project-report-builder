import i18n from '../i18n'
import { statusLabel } from '../export/tokens'
import type { BlockType, ChartSeries } from '../types'

export function availableCount(type: BlockType, charts: ChartSeries[]): number {
  switch (type) {
    case 'header':
    case 'status':
      return 1
    case 'chart':
      return charts.length
    default:
      return 0
  }
}

export function defaultData(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'header':
      return { project_name: '', update_date: new Date().toISOString().slice(0, 10), author: '' }
    case 'status':
      return { label: statusLabel('on_track'), tone: 'on_track' }
    case 'summary':
      return { text: '' }
    case 'kpi':
      return { metrics: [] }
    case 'list':
      return { title: i18n.t('defaults.newListTitle'), items: [] }
    case 'chart':
      return { title: '', points: [], kind: 'bar' }
    case 'image':
      return { filename: '', data_url: '' }
    case 'note':
      return { title: '', text: '' }
  }
}
