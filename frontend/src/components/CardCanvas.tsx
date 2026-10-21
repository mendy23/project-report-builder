import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import CanvasBlock from './CanvasBlock'
import ExcludeBox from './ExcludeBox'
import { useCardStore } from '../store'
import { addGenerated } from '../llm/run'
import { fieldOfBlock } from '../store/llmSlice'
import type { BlockField, BlockType, Status } from '../types'
import { STATUS_COLOR } from '../export/tokens'

const GENERATED: BlockField[] = ['summary', 'kpi', 'risks', 'next_steps']

export default function CardCanvas() {
  const { t } = useTranslation()
  const card = useCardStore((s) => s.card)
  const swapBlocks = useCardStore((s) => s.swapBlocks)
  const addBlock = useCardStore((s) => s.addBlock)
  const insertBlockAt = useCardStore((s) => s.insertBlockAt)
  const setCardStatus = useCardStore((s) => s.setCardStatus)
  const dragKeywordIn = useCardStore((s) => s.dragKeywordIn)
  const pending = useCardStore((s) => s.llm.pending)

  const [endDragOver, setEndDragOver] = useState(false)

  if (!card) return null

  const ordered = [...card.blocks].sort((a, b) => a.order - b.order)

  function handleDrop(e: React.DragEvent, targetIndex: number | null) {
    e.preventDefault()
    e.stopPropagation()
    setEndDragOver(false)

    const status = e.dataTransfer.getData('application/x-status')
    if (status) {
      setCardStatus(status as Status)
      return
    }

    const blockType = e.dataTransfer.getData('application/x-block-type')
    if (blockType) {
      if (GENERATED.includes(blockType as BlockField)) void addGenerated(blockType as BlockField)
      else addBlock(blockType as BlockType)
      return
    }

    const blockData = e.dataTransfer.getData('application/x-block-data')
    if (blockData) {
      const { type, data } = JSON.parse(blockData)
      insertBlockAt(targetIndex ?? ordered.length, {
        id: crypto.randomUUID(),
        type,
        order: 0,
        data,
      })
      return
    }

    const keyword = e.dataTransfer.getData('application/x-keyword')
    if (keyword) {
      const { text } = JSON.parse(keyword) as { text: string }
      const target = targetIndex === null ? undefined : ordered[targetIndex]
      const field = target && fieldOfBlock(pending, target.id)
      if (field && field !== 'status') dragKeywordIn(field, text)
      return
    }

    const fromId = e.dataTransfer.getData('application/x-block-drag')
    if (fromId && targetIndex !== null) {
      const targetBlock = ordered[targetIndex]
      const fixed = targetBlock?.type === 'header' || targetBlock?.type === 'status'
      if (targetBlock && !fixed && targetBlock.id !== fromId) {
        swapBlocks(fromId, targetBlock.id)
      }
    }
  }

  return (
    <div
      className="flex-1 overflow-auto bg-slate-50 p-8"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (e.dataTransfer.getData('application/x-block-drag')) return
        handleDrop(e, null)
      }}
    >
      <ExcludeBox />
      <div className="mx-auto" style={{ width: 560 }}>
        <div
          className="bg-white p-6"
          style={{ borderLeft: `4px solid ${STATUS_COLOR[card.status]}` }}
        >
          {ordered.map((block, index) => {
            const node = (
              <CanvasBlock key={block.id} block={block} index={index} onDrop={handleDrop} />
            )
            // the status tag shares the row of the header block above it
            if (block.type === 'header' && ordered[index + 1]?.type === 'status') {
              return (
                <div key={block.id} className="flex items-start">
                  <div className="min-w-0 flex-1">{node}</div>
                  <div className="max-w-[40%] shrink-0">
                    <CanvasBlock block={ordered[index + 1]} index={index + 1} onDrop={handleDrop} />
                  </div>
                </div>
              )
            }
            if (block.type === 'status' && ordered[index - 1]?.type === 'header') return null
            return node
          })}

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setEndDragOver(true)
            }}
            onDragLeave={() => setEndDragOver(false)}
            onDrop={(e) => handleDrop(e, ordered.length)}
            className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400"
            style={{
              borderColor: endDragOver ? 'var(--color-indigo-600)' : undefined,
              background: endDragOver ? '#f0f0ff' : undefined,
            }}
          >
            {t('canvas.dropZone')}
          </div>
        </div>
      </div>
    </div>
  )
}
