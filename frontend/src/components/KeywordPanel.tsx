import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCardStore } from '../store'

export default function KeywordPanel() {
  const { t } = useTranslation()
  const hasCard = useCardStore((s) => s.card !== null)
  const keywords = useCardStore((s) => s.keywords)
  const lists = useCardStore((s) => s.lists)
  const addCustomKeyword = useCardStore((s) => s.addCustomKeyword)
  const removeKeyword = useCardStore((s) => s.removeKeyword)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  if (!hasCard) return null

  const close = () => {
    setAdding(false)
    setDraft('')
  }
  const used = (text: string) => Object.values(lists).some((list) => list.include.includes(text))

  return (
    <>
      <h2 className="mt-5 px-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
        {t('keywords.heading')}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {keywords.map(({ text, custom }) => (
          <span
            key={text}
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData('application/x-keyword', JSON.stringify({ text }))
            }
            className={`flex items-center gap-1 rounded-full border bg-white px-2.5 py-0.5 text-xs shadow-sm ${
              used(text) ? 'border-indigo-300 text-indigo-900' : 'border-slate-300 text-slate-800'
            }`}
          >
            {custom && (
              <button
                type="button"
                onClick={() => removeKeyword(text)}
                aria-label={t('keywords.remove', { text })}
                className="-ml-1.5 flex size-4 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            )}
            {used(text) && <span aria-hidden>✓</span>}
            {text}
          </span>
        ))}
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const text = draft.trim()
                if (text) addCustomKeyword(text)
                close()
              } else if (e.key === 'Escape') close()
            }}
            onBlur={close}
            aria-label={t('keywords.addLabel')}
            placeholder={t('keywords.addPlaceholder')}
            className="w-28 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label={t('keywords.addLabel')}
            className="flex size-6 items-center justify-center rounded-full border border-slate-300 text-base leading-none text-slate-600 hover:bg-slate-100"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
        )}
      </div>
    </>
  )
}
