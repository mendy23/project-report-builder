import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import InlineText from './InlineText'
import { COLOR } from '../export/tokens'
import { noteLines } from '../export/note'

export default function NoteText({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)

  if (editing || value.trim() === '') {
    return (
      <div onFocus={() => setEditing(true)} onBlur={() => setEditing(false)}>
        <InlineText
          label={t('blockEdit.noteText')}
          placeholder={t('blockEdit.notePlaceholder')}
          value={value}
          onChange={onChange}
          style={{ fontSize: 14, lineHeight: '20px', color: COLOR.ink }}
        />
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('blockEdit.noteText')}
      onClick={() => setEditing(true)}
      onFocus={() => setEditing(true)}
    >
      {noteLines(value).map((line, i) =>
        line.bullet ? (
          <ul key={i} className="list-disc pl-4">
            <li style={{ fontSize: 13, color: COLOR.ink }}>{line.text}</li>
          </ul>
        ) : (
          <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: COLOR.ink }}>
            {line.text}
          </p>
        ),
      )}
    </div>
  )
}
