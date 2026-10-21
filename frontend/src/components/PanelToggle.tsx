import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  onToggle: () => void
}

export default function PanelToggle({ open, onToggle }: Props) {
  const { t } = useTranslation()
  const label = open ? t('edit.hidePanel') : t('edit.showPanel')

  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <path d="M6 3v10" />
      </svg>
    </button>
  )
}
