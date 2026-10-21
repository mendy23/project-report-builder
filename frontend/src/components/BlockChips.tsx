import { useTranslation } from 'react-i18next'

import { useCardStore } from '../store'
import type { BlockField } from '../types'

export default function BlockChips({ field }: { field: BlockField }) {
  const { t } = useTranslation()
  const pending = useCardStore((s) => s.lists[field].pending)
  const undoChip = useCardStore((s) => s.undoChip)

  if (pending.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {pending.map((text) => (
        <span
          key={text}
          className="flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 py-0.5 pr-1 pl-2.5 text-xs text-indigo-900 shadow-sm"
        >
          {text}
          <button
            type="button"
            onClick={() => undoChip(field, text)}
            aria-label={t('enhance.removeChip', { text })}
            className="flex size-4 items-center justify-center rounded-full hover:bg-indigo-200"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
