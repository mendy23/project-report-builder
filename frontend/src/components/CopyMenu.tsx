import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  options: { id: string; label: string; best: string; tested?: string }[]
  disabled: boolean
  onCopy: (id: string) => void
}

// opens on hover or click (a click never closes it, since the hover has opened it already); the padding above the list keeps it open while the pointer crosses
export default function CopyMenu({ options, disabled, onCopy }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm enabled:hover:bg-slate-100 disabled:opacity-50"
      >
        {t('edit.copyButton')}
      </button>
      {open && !disabled && (
        <div role="menu" className="absolute top-full right-0 z-20 pt-1">
          <div className="w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {options.map(({ id, label, best, tested }) => (
              <div key={id} className="flex items-center hover:bg-slate-100">
                <button
                  role="menuitem"
                  type="button"
                  aria-label={t('edit.copyAria', { label })}
                  onClick={() => {
                    setOpen(false)
                    onCopy(id)
                  }}
                  className="flex-1 px-3 py-2 text-left text-sm"
                >
                  {label}
                </button>
                <span
                  tabIndex={0}
                  aria-label={t('edit.infoAria', { label })}
                  className="group relative mr-2 flex size-5 cursor-default items-center justify-center rounded-full border border-slate-300 text-xs text-slate-500"
                >
                  i
                  <span
                    role="tooltip"
                    className="absolute top-1/2 right-full z-30 mr-3 hidden w-52 -translate-y-1/2 rounded-lg bg-slate-800 px-3 py-2 text-left text-xs leading-snug text-white shadow-lg group-focus:block group-hover:block"
                  >
                    {best}
                    {tested && <span className="mt-1 block text-slate-300">{tested}</span>}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
