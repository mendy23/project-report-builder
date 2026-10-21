import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import BlockChips from './BlockChips'
import BlockWarnings from './BlockWarnings'
import EditableBlockContent from './EditableBlockContent'
import EnhanceButton from './EnhanceButton'
import WritingDots from './WritingDots'
import { currentValue, isEmptyValue } from '../llm/apply'
import { useCardStore } from '../store'
import { fieldOfBlock } from '../store/llmSlice'
import type { Block } from '../types'

const FIXED_TYPES: Block['type'][] = ['header', 'status']

interface Props {
  block: Block
  index: number
  onDrop: (e: React.DragEvent, index: number) => void
}

export default function CanvasBlock({ block, index, onDrop }: Props) {
  const { t } = useTranslation()
  const selectBlock = useCardStore((s) => s.selectBlock)
  const removeBlock = useCardStore((s) => s.removeBlock)
  const selected = useCardStore((s) => s.selectedBlockId === block.id)
  const llm = useCardStore((s) => s.llm)
  const [hovered, setHovered] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const field = fieldOfBlock(llm.pending, block.id)
  // a star rewrite streams one block while the card's draft is already done, so check both
  const writing =
    field !== null && (llm.status === 'streaming' || llm.blockStatus[field] === 'streaming')
  const card = useCardStore((s) => s.card)
  const waiting =
    field !== null &&
    !FIXED_TYPES.includes(block.type) &&
    llm.blockStatus[field] === 'streaming' &&
    !!card &&
    isEmptyValue(currentValue(card, llm.pending, field))
  const error = field && llm.blockError[field]

  return (
    <div
      data-block-field={field ?? undefined}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false)
        onDrop(e, index)
      }}
      onClick={() => selectBlock(block.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative mb-3 rounded-lg py-3 transition-colors ${
        FIXED_TYPES.includes(block.type) ? 'pr-2' : 'pr-16'
      } ${block.type === 'status' ? 'pl-2' : 'pl-9'}`}
      style={{
        outline: selected
          ? '2px solid var(--color-indigo-600)'
          : dragOver
            ? '2px dashed var(--color-indigo-600)'
            : 'none',
        outlineOffset: '2px',
        background: hovered || selected ? '#f8f8fa' : 'transparent',
      }}
    >
      {!FIXED_TYPES.includes(block.type) && (
        <>
          <span
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-block-drag', block.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            aria-label={t('enhance.drag')}
            className="absolute inset-y-0 left-0 flex w-6 cursor-grab items-center justify-center rounded-l-lg text-xs text-slate-400 select-none hover:bg-slate-200 active:bg-slate-300"
          >
            ⋮⋮
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeBlock(block.id)
            }}
            aria-label={t('canvas.removeAria', { type: block.type })}
            className={`absolute inset-y-0 right-0 flex w-5 items-center justify-center rounded-r-lg text-red-700 hover:bg-red-100 active:bg-red-300 ${
              hovered || selected ? '' : 'opacity-0'
            }`}
          >
            ×
          </button>
        </>
      )}
      {field && field !== 'status' && llm.status !== 'streaming' && (
        <EnhanceButton field={field} visible={hovered || selected} />
      )}

      <EditableBlockContent block={block} readOnly={writing} />
      {waiting && <WritingDots />}
      <BlockWarnings blockId={block.id} />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {t('enhance.error', { message: error })}
        </p>
      )}
      {field && <BlockChips field={field} />}
    </div>
  )
}
