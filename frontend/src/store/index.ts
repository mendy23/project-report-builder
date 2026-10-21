import { create, type StateCreator } from 'zustand'

import { defaultData } from './blockDefaults'
import { createLlmSlice } from './llmSlice'
import type { CardStore, EditorSlice } from './types'
import { statusLabel } from '../export/tokens'
import type { Block } from '../types'

export type { LlmState, UploadedImage } from './types'

function renumber(blocks: Block[]): Block[] {
  return blocks.map((block, index) => ({ ...block, order: index }))
}

const createEditorSlice: StateCreator<CardStore, [], [], EditorSlice> = (set) => ({
  card: null,
  selectedBlockId: null,
  removed: [],
  images: [],

  selectBlock: (id) => set({ selectedBlockId: id }),

  updateBlockData: (id, patch) =>
    set((state) =>
      state.card === null
        ? state
        : {
            card: {
              ...state.card,
              blocks: state.card.blocks.map((block) =>
                block.id === id ? { ...block, data: { ...block.data, ...patch } } : block,
              ),
            },
          },
    ),

  swapBlocks: (fromId, toId) =>
    set((state) => {
      if (state.card === null) return state
      const blocks = [...state.card.blocks].sort((a, b) => a.order - b.order)
      const fromIdx = blocks.findIndex((b) => b.id === fromId)
      const toIdx = blocks.findIndex((b) => b.id === toId)
      if (fromIdx === -1 || toIdx === -1) return state
      ;[blocks[fromIdx], blocks[toIdx]] = [blocks[toIdx], blocks[fromIdx]]
      return { card: { ...state.card, blocks: renumber(blocks) } }
    }),

  addBlock: (type, data) =>
    set((state) => {
      if (state.card === null) return state
      const block: Block = {
        id: crypto.randomUUID(),
        type,
        order: state.card.blocks.length,
        data: data ?? defaultData(type),
      }
      return {
        card: { ...state.card, blocks: renumber([...state.card.blocks, block]) },
        selectedBlockId: block.id,
      }
    }),

  insertBlockAt: (index, block) =>
    set((state) => {
      if (state.card === null) return state
      const blocks = [...state.card.blocks].sort((a, b) => a.order - b.order)
      const clamped = Math.max(0, Math.min(index, blocks.length))
      blocks.splice(clamped, 0, { ...block, order: clamped })
      return { card: { ...state.card, blocks: renumber(blocks) } }
    }),

  removeBlock: (id) =>
    set((state) => {
      if (state.card === null) return state
      const ordered = [...state.card.blocks].sort((a, b) => a.order - b.order)
      const index = ordered.findIndex((block) => block.id === id)
      if (index === -1) return state
      const blocks = renumber(ordered.filter((block) => block.id !== id))
      return {
        card: { ...state.card, blocks },
        removed: [...state.removed, { block: ordered[index], index }],
        selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
      }
    }),

  undoRemove: () =>
    set((state) => {
      const last = state.removed[state.removed.length - 1]
      if (state.card === null || !last) return state
      const blocks = [...state.card.blocks].sort((a, b) => a.order - b.order)
      blocks.splice(Math.min(last.index, blocks.length), 0, last.block)
      return {
        card: { ...state.card, blocks: renumber(blocks) },
        removed: state.removed.slice(0, -1),
        selectedBlockId: last.block.id,
      }
    }),

  // the card's status and the text of its status block always change together
  setCardStatus: (status) =>
    set((state) => {
      if (state.card === null) return state
      const blocks = state.card.blocks.map((block) =>
        block.type === 'status'
          ? { ...block, data: { ...block.data, label: statusLabel(status), tone: status } }
          : block,
      )
      return { card: { ...state.card, status, blocks } }
    }),

  addImage: (image) => set((state) => ({ images: [...state.images, image] })),
})

export const useCardStore = create<CardStore>()((...args) => ({
  ...createEditorSlice(...args),
  ...createLlmSlice(...args),
}))
