export type ChartKind = 'bar' | 'line' | 'pie'

export type BlockType =
  'header' | 'status' | 'summary' | 'kpi' | 'chart' | 'image' | 'list' | 'note'

export type Status = 'on_track' | 'at_risk' | 'blocked'

export interface Block {
  id: string
  type: BlockType
  order: number
  data: Record<string, unknown>
}

export interface Card {
  id: string
  project_name: string
  status: Status
  blocks: Block[]
  created_at: string
}

export interface Metric {
  label: string
  value: string
}

export type BlockField = 'title' | 'status' | 'summary' | 'kpi' | 'risks' | 'next_steps'

export interface BlockLists {
  include: string[]
  exclude: string[]
  pending: string[]
}

export interface Keyword {
  text: string
  custom: boolean
}

export interface BlockRequest {
  session_id: string
  block: BlockField
  add: string[]
  exclude: string[]
  current: unknown
}

export interface BlockDone {
  value: unknown
  warnings: string[]
}

export interface DraftRequest {
  session_id: string
  blocks: BlockField[]
  exclude: Partial<Record<BlockField, string[]>>
}

export interface DraftDone {
  values: Partial<Record<BlockField, unknown>>
  suggestions: string[]
  warnings: Partial<Record<BlockField, string[]>>
  failed: Partial<Record<BlockField, string>>
}

export type LlmWarnings = Record<string, string[]>

export interface ChartSeries {
  title: string
  points: ChartPoint[]
  kind: ChartKind
}

export interface HeaderData {
  project_name: string
  update_date: string
  author: string
}
export interface StatusData {
  label: string
  tone: Status
}
export interface SummaryData {
  text: string
}
export interface KpiEntry {
  label: string
  value: string
}
export interface KpiData {
  metrics: KpiEntry[]
}
export interface ChartPoint {
  label: string
  value: string
}
export interface ChartData {
  title: string
  points: ChartPoint[]
  kind: ChartKind
}
export interface ImageData {
  filename: string
  data_url: string
}
export interface ListData {
  title: string
  items: string[]
}
export interface NoteData {
  title: string
  text: string
}
