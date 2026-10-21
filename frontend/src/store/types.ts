import type {
  Block,
  BlockField,
  BlockType,
  Card,
  ChartSeries,
  Keyword,
  LlmWarnings,
  Status,
} from '../types'
import type { Lists } from './keywords'

export interface UploadedImage {
  id: string
  filename: string
  data_url: string
}

type RunStatus = 'streaming' | 'done' | 'error'

export interface LlmState {
  status: 'idle' | 'streaming' | 'done'
  sessionId: string | null
  pending: Record<string, string>
  blockStatus: Partial<Record<BlockField, RunStatus>>
  blockError: Partial<Record<BlockField, string>>
  warnings: LlmWarnings
  // fields whose first draft came back empty, so there is nothing to add for them
  noContent: BlockField[]
}

export interface EditorSlice {
  card: Card | null
  selectedBlockId: string | null
  // blocks deleted from the card, most recent last, so Undo can put them back where they were
  removed: { block: Block; index: number }[]
  images: UploadedImage[]
  selectBlock: (id: string | null) => void
  updateBlockData: (id: string, patch: Record<string, unknown>) => void
  swapBlocks: (fromId: string, toId: string) => void
  addBlock: (type: BlockType, data?: Record<string, unknown>) => void
  insertBlockAt: (index: number, block: Block) => void
  removeBlock: (id: string) => void
  undoRemove: () => void
  setCardStatus: (status: Status) => void
  addImage: (image: UploadedImage) => void
}

export interface LlmSlice {
  charts: ChartSeries[]
  lists: Lists
  keywords: Keyword[]
  llm: LlmState
  load: (
    card: Card,
    charts: ChartSeries[],
    pending: Record<string, string>,
    sessionId: string,
  ) => void
  clear: () => void
  beginPipeline: () => void
  finishPipeline: () => void
  setBlockStatus: (field: BlockField, status: RunStatus) => void
  applyBlockValue: (field: BlockField, value: unknown) => void
  finishDraft: (field: BlockField, value: unknown, warnings: string[]) => void
  addKeywords: (texts: string[]) => void
  finishEnhance: (field: BlockField, value: unknown, warnings: string[]) => void
  failBlock: (field: BlockField, message: string) => void
  addGeneratedBlock: (field: BlockField) => void
  dragKeywordIn: (field: BlockField, text: string) => void
  addCustomKeyword: (text: string) => void
  removeKeyword: (text: string) => void
  undoChip: (field: BlockField, text: string) => void
  excludePhrase: (field: BlockField, phrase: string) => void
}

export type CardStore = EditorSlice & LlmSlice
