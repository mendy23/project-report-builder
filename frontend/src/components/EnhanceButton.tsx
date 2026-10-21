import { useTranslation } from 'react-i18next'

import { enhanceBlock } from '../llm/run'
import { useCardStore } from '../store'
import type { BlockField } from '../types'

export default function EnhanceButton({ field, visible }: { field: BlockField; visible: boolean }) {
  const { t } = useTranslation()
  const streaming = useCardStore((s) => s.llm.blockStatus[field] === 'streaming')

  return (
    <span className="absolute top-3 right-7">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void enhanceBlock(field)
        }}
        disabled={streaming}
        aria-label={t('enhance.label', { block: t(`keywords.${field}`) })}
        className={`peer flex size-6 items-center justify-center text-indigo-600 disabled:opacity-20 ${
          visible ? 'opacity-40 hover:opacity-80' : 'opacity-0'
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <path d="M12 0C12.6 6.7 17.3 11.4 24 12 17.3 12.6 12.6 17.3 12 24 11.4 17.3 6.7 12.6 0 12 6.7 11.4 11.4 6.7 12 0Z" />
        </svg>
      </button>
      {visible && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-full right-0 z-20 mt-1 hidden rounded bg-slate-800 px-2 py-1 text-xs whitespace-nowrap text-white shadow peer-hover:block peer-focus-visible:block"
        >
          {t('enhance.tooltip')}
        </span>
      )}
    </span>
  )
}
