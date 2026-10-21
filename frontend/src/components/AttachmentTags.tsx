import { useTranslation } from 'react-i18next'

import type { UploadedImage } from '../store'

export interface Attachment {
  id: string
  name: string
  csv?: string
  image?: UploadedImage
  block?: string
}

interface Props {
  attachments: Attachment[]
  onRemove: (item: Attachment) => void
}

export default function AttachmentTags({ attachments, onRemove }: Props) {
  const { t } = useTranslation()
  if (attachments.length === 0) return null

  return (
    <div className="mb-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max flex-col gap-2">
        {[0, 1].map((row) => (
          <ul key={row} className="flex gap-2">
            {attachments
              .filter((_, index) => index % 2 === row)
              .map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1.5 text-sm text-slate-700 shadow-sm"
                >
                  {item.name}
                  <button
                    onClick={() => onRemove(item)}
                    aria-label={t('input.removeFile', { name: item.name })}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                  >
                    ×
                  </button>
                </li>
              ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
