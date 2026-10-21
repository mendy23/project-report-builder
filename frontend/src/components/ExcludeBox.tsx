import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCardStore } from '../store'
import type { BlockField } from '../types'

const TEXT_FIELDS: string[] = ['summary', 'risks', 'next_steps']

export default function ExcludeBox() {
  const { t } = useTranslation()
  const excludePhrase = useCardStore((s) => s.excludePhrase)
  const [drag, setDrag] = useState<{ field: BlockField; phrase: string } | null>(null)

  useEffect(() => {
    const start = (e: DragEvent) => {
      const phrase = window.getSelection()?.toString().trim() ?? ''
      const node = e.target as Node
      const element = node instanceof Element ? node : node.parentElement
      const field = element?.closest('[data-block-field]')?.getAttribute('data-block-field')
      if (phrase && field && TEXT_FIELDS.includes(field)) {
        setDrag({ field: field as BlockField, phrase })
      }
    }
    const end = () => setDrag(null)
    document.addEventListener('dragstart', start)
    document.addEventListener('dragend', end)
    return () => {
      document.removeEventListener('dragstart', start)
      document.removeEventListener('dragend', end)
    }
  }, [])

  if (!drag) return null

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        excludePhrase(drag.field, drag.phrase)
        setDrag(null)
      }}
      className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-xl border-2 border-dashed border-red-300 bg-white px-6 py-4 text-sm font-medium text-red-700 shadow-lg"
    >
      {t('exclude.drop')}
    </div>
  )
}
