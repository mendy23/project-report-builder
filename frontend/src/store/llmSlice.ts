import type { StateCreator } from 'zustand'

import i18n from '../i18n'
import { applyValue, isEmptyValue, removeEmptyBlock, REMOVABLE } from '../llm/apply'
import { removePhrase } from '../llm/text'
import type { Block, BlockField, Keyword } from '../types'
import { clearPending, dragIn, emptyLists, excludePhrase, undoPending } from './keywords'
import type { CardStore, LlmSlice, LlmState } from './types'

const IDLE_LLM: LlmState = {
  status: 'idle',
  sessionId: null,
  pending: {},
  blockStatus: {},
  blockError: {},
  warnings: {},
  noContent: [],
}

const withKeywords = (current: Keyword[], texts: string[], custom: boolean): Keyword[] => [
  ...current,
  ...texts
    .filter((text, i) => texts.indexOf(text) === i && !current.some((k) => k.text === text))
    .map((text) => ({ text, custom })),
]

// a function, so the titles are read after the translations have loaded
const generatedDefaults = (): Record<string, Record<string, unknown>> => ({
  summary: { text: '' },
  kpi: { metrics: [] },
  risks: { title: i18n.t('defaults.risksTitle'), items: [] },
  next_steps: { title: i18n.t('defaults.nextStepsTitle'), items: [] },
})

export function fieldOfBlock(pending: Record<string, string>, blockId: string): BlockField | null {
  const field = Object.keys(pending).find((key) => pending[key] === blockId)
  return (field as BlockField | undefined) ?? null
}

export const createLlmSlice: StateCreator<CardStore, [], [], LlmSlice> = (set) => ({
  charts: [],
  lists: emptyLists(),
  keywords: [],
  llm: IDLE_LLM,

  load: (card, charts, pending, sessionId) =>
    set({
      card,
      charts,
      lists: emptyLists(),
      keywords: [],
      selectedBlockId: null,
      removed: [],
      images: [],
      llm: { ...IDLE_LLM, pending, sessionId },
    }),
  clear: () =>
    set({
      card: null,
      charts: [],
      lists: emptyLists(),
      keywords: [],
      selectedBlockId: null,
      removed: [],
      images: [],
      llm: IDLE_LLM,
    }),

  beginPipeline: () =>
    set((state) => ({
      lists: emptyLists(),
      keywords: [],
      llm: {
        ...IDLE_LLM,
        pending: state.llm.pending,
        sessionId: state.llm.sessionId,
        status: 'streaming',
      },
    })),
  finishPipeline: () => set((state) => ({ llm: { ...state.llm, status: 'done' } })),

  setBlockStatus: (field, status) =>
    set((state) => ({
      llm: {
        ...state.llm,
        blockStatus: { ...state.llm.blockStatus, [field]: status },
        blockError: { ...state.llm.blockError, [field]: undefined },
      },
    })),
  applyBlockValue: (field, value) =>
    set((state) =>
      state.card ? { card: applyValue(state.card, state.llm.pending, field, value) } : state,
    ),
  finishDraft: (field, value, warnings) =>
    set((state) => {
      if (!state.card) return state
      const filled = applyValue(state.card, state.llm.pending, field, value)
      const drop = isEmptyValue(value) && REMOVABLE.includes(field)
      return {
        card: drop ? removeEmptyBlock(filled, state.llm.pending, field) : filled,
        llm: {
          ...state.llm,
          blockStatus: { ...state.llm.blockStatus, [field]: 'done' },
          warnings: { ...state.llm.warnings, [field]: warnings },
          noContent: drop ? [...state.llm.noContent, field] : state.llm.noContent,
        },
      }
    }),
  finishEnhance: (field, value, warnings) =>
    set((state) => {
      if (!state.card) return state
      return {
        card: applyValue(state.card, state.llm.pending, field, value),
        lists: clearPending(state.lists, field),
        llm: {
          ...state.llm,
          blockStatus: { ...state.llm.blockStatus, [field]: 'done' },
          warnings: { ...state.llm.warnings, [field]: warnings },
        },
      }
    }),
  failBlock: (field, message) =>
    set((state) => ({
      llm: {
        ...state.llm,
        blockStatus: { ...state.llm.blockStatus, [field]: 'error' },
        blockError: { ...state.llm.blockError, [field]: message },
      },
    })),

  addGeneratedBlock: (field) =>
    set((state) => {
      if (!state.card || field === 'title' || field === 'status') return state
      const block: Block = {
        id: crypto.randomUUID(),
        type: field === 'summary' ? 'summary' : field === 'kpi' ? 'kpi' : 'list',
        order: state.card.blocks.length,
        data: generatedDefaults()[field],
      }
      return {
        card: { ...state.card, blocks: [...state.card.blocks, block] },
        selectedBlockId: block.id,
        llm: { ...state.llm, pending: { ...state.llm.pending, [field]: block.id } },
      }
    }),
  dragKeywordIn: (field, text) => set((state) => ({ lists: dragIn(state.lists, field, text) })),
  addKeywords: (texts) =>
    set((state) => ({ keywords: withKeywords(state.keywords, texts, false) })),
  addCustomKeyword: (text) =>
    set((state) => ({ keywords: withKeywords(state.keywords, [text], true) })),
  removeKeyword: (text) =>
    set((state) => ({ keywords: state.keywords.filter((k) => k.text !== text) })),
  undoChip: (field, text) => set((state) => ({ lists: undoPending(state.lists, field, text) })),
  excludePhrase: (field, phrase) =>
    set((state) => {
      const id = state.llm.pending[field]
      const card = state.card && {
        ...state.card,
        blocks: state.card.blocks.map((b) =>
          b.id === id ? { ...b, data: removePhrase(b.data, field, phrase) } : b,
        ),
      }
      return { card, lists: excludePhrase(state.lists, field, phrase) }
    }),
})
