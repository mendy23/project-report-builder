import { useTranslation } from 'react-i18next'

export default function WritingDots() {
  const { t } = useTranslation()

  return (
    <div role="status" aria-label={t('llm.writing')} className="flex items-center gap-1 py-2">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className="size-1.5 animate-bounce rounded-full bg-slate-400"
        />
      ))}
    </div>
  )
}
