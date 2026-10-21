import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { generateCard, type GenerateInput, type GenerateResponse } from '../api'
import i18n from '../i18n'
import { readImage } from '../ingest/ocr'
import AttachmentTags, { type Attachment } from '../components/AttachmentTags'
import { useCardStore } from '../store'

interface Props {
  onGenerated: (result: GenerateResponse, input: GenerateInput) => void
}

const TEXT_EXTENSIONS = ['.txt', '.md', '.json']

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(i18n.t('errors.readFailed', { name: file.name })))
    reader.readAsDataURL(file)
  })
}

export default function InputScreen({ onGenerated }: Props) {
  const { t } = useTranslation()
  const headings = t('input.titles', { returnObjects: true }) as string[]
  const addImage = useCardStore((s) => s.addImage)
  const [heading] = useState(() => Math.floor(Math.random() * headings.length))
  const [projectName, setProjectName] = useState('')
  const [focus, setFocus] = useState('')
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(0)
  const [error, setError] = useState<string | null>(null)

  function appendNote(block: string) {
    setNotes(
      (current) => `${current && !current.endsWith('\n') ? `${current}\n\n` : current}${block}`,
    )
  }

  async function acceptFiles(files: FileList | null) {
    if (!files) return
    setError(null)
    // a count, not a flag: a second drop can finish while the first is still running OCR
    setReading((n) => n + 1)
    for (const file of Array.from(files)) {
      try {
        const id = crypto.randomUUID()
        if (file.type.startsWith('image/')) {
          const block = `${file.name}:\n${await readImage(file)}\n\n`
          appendNote(block)
          const image = { id, filename: file.name, data_url: await fileToDataUrl(file) }
          setAttachments((current) => [...current, { id, name: file.name, block, image }])
        } else if (
          file.type === 'text/plain' ||
          // browsers report .md and .json with inconsistent or empty types, so match the name
          TEXT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
        ) {
          const block = `${file.name}:\n${await file.text()}\n\n`
          appendNote(block)
          setAttachments((current) => [...current, { id, name: file.name, block }])
        } else {
          const csv = await file.text()
          setAttachments((current) => [...current, { id, name: file.name, csv }])
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    }
    setReading((n) => n - 1)
  }

  function removeAttachment(item: Attachment) {
    setAttachments((current) => current.filter((a) => a.id !== item.id))
    if (item.block) setNotes((current) => current.replace(item.block!, ''))
  }

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const input: GenerateInput = {
        project_name: projectName.trim(),
        focus: focus.trim(),
        text: notes,
        tables: attachments.flatMap((a) => (a.csv ? [a.csv] : [])),
      }
      const result = await generateCard(input)
      for (const { image } of attachments) {
        if (image) addImage(image)
      }
      onGenerated(result, input)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
        {t('input.appName')}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{headings[heading]}</h1>

      <label htmlFor="project" className="mt-8 block text-sm font-medium">
        {t('input.projectNameLabel')}
      </label>
      <input
        id="project"
        value={projectName}
        onChange={(event) => setProjectName(event.target.value)}
        placeholder={t('input.projectNamePlaceholder')}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
      />

      <label htmlFor="focus" className="mt-6 block text-sm font-medium">
        {t('input.focusLabel')}
      </label>
      <input
        id="focus"
        value={focus}
        onChange={(event) => setFocus(event.target.value)}
        placeholder={t('input.focusPlaceholder')}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      <p className="mt-1 text-xs text-slate-500">{t('input.focusHint')}</p>

      <label htmlFor="notes" className="mt-6 block text-sm font-medium">
        {t('input.notesLabel')}
      </label>
      <div
        onDrop={(event) => {
          event.preventDefault()
          void acceptFiles(event.dataTransfer.files)
        }}
        onDragOver={(event) => event.preventDefault()}
        className="mt-1 rounded-2xl border border-slate-300 p-3 focus-within:border-indigo-500"
      >
        <AttachmentTags attachments={attachments} onRemove={removeAttachment} />
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t('input.notesPlaceholder')}
          className="max-h-[65vh] min-h-[45vh] w-full resize-none overflow-y-auto bg-transparent text-base outline-none field-sizing-content"
        />
        <div className="flex items-center justify-between">
          <label
            htmlFor="files"
            title={t('input.attachLabel')}
            aria-label={t('input.attachLabel')}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-300 text-xl leading-none text-slate-600 hover:bg-slate-100"
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
          </label>
          <button
            onClick={() => void generate()}
            disabled={busy || reading > 0}
            className="rounded-lg bg-indigo-600 px-5 py-1.5 font-medium text-white disabled:opacity-50"
          >
            {busy || reading > 0 ? t('input.workingButton') : t('input.generateButton')}
          </button>
        </div>
        <input
          id="files"
          type="file"
          multiple
          accept=".txt,.md,.json,text/plain,.csv,text/csv,image/*"
          onChange={(event) => void acceptFiles(event.target.files)}
          className="sr-only"
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">{t('input.formatsHint')}</p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </main>
  )
}
