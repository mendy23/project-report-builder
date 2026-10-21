import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import BlockPalette from '../components/BlockPalette'
import CardCanvas from '../components/CardCanvas'
import CopyMenu from '../components/CopyMenu'
import PanelToggle from '../components/PanelToggle'
import { copyCard, type CopyFormat } from '../export/copy'
import { renderPng } from '../export/png'
import { useCardStore } from '../store'

interface Props {
  onBack: () => void
}

export default function EditScreen({ onBack }: Props) {
  const { t } = useTranslation()
  const card = useCardStore((s) => s.card)
  const [message, setMessage] = useState<string | null>(null)
  const streaming = useCardStore((s) => s.llm.status === 'streaming')
  const [busy, setBusy] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const locked = busy || streaming
  const undoRemove = useCardStore((s) => s.undoRemove)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [message])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return
      // inside a text field Cmd+Z undoes typing, as usual
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable]')) return
      e.preventDefault()
      undoRemove()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undoRemove])

  if (!card) return null

  const formats: { format: CopyFormat; label: string; best: string; tested?: string }[] = [
    {
      format: 'html',
      label: t('edit.formatRichText'),
      best: t('edit.formatRichTextBest'),
      tested: t('edit.formatRichTextTested'),
    },
    {
      format: 'png',
      label: t('edit.formatImage'),
      best: t('edit.formatImageBest'),
      tested: t('edit.formatImageTested'),
    },
    {
      format: 'text',
      label: t('edit.formatPlainText'),
      best: t('edit.formatPlainTextBest'),
    },
  ]

  async function run(what: string, job: () => Promise<string>) {
    setBusy(true)
    try {
      setMessage(await job())
    } catch (cause) {
      setMessage(
        t('edit.failedMessage', {
          what,
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    const blob = await renderPng(card!)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${card!.project_name || t('common.untitled')}.png`
    link.click()
    // Safari starts the download after click() returns, so the URL must outlive this call
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return t('edit.downloadedMessage', { size: Math.round(blob.size / 1024) })
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <button onClick={onBack} className="text-sm font-medium text-slate-700">
          {t('edit.backButton')}
        </button>
        <span className="text-sm font-semibold">{card.project_name || t('common.untitled')}</span>

        <div className="ml-auto flex items-center gap-2">
          <CopyMenu
            options={formats.map(({ format, label, best, tested }) => ({
              id: format,
              label,
              best,
              tested,
            }))}
            disabled={locked}
            onCopy={(id) => {
              const { format, label } = formats.find((f) => f.format === id)!
              void run(t('edit.copyWhat'), async () => {
                await copyCard(card, format)
                return t('edit.copiedAsMessage', { label: label.toLowerCase() })
              })
            }}
          />

          <button
            onClick={() => void run(t('edit.downloadWhat'), download)}
            disabled={locked}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm enabled:hover:bg-slate-100 disabled:opacity-50"
          >
            {t('edit.downloadButton')}
          </button>
        </div>
      </header>

      {message && (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg"
        >
          {message}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {/* hidden, not unmounted, so the panel keeps a half-typed keyword and open sections */}
        <BlockPalette hidden={!panelOpen} onCollapse={() => setPanelOpen(false)} />
        {!panelOpen && (
          <div className="w-12 shrink-0 border-r border-slate-200 bg-white p-2">
            <PanelToggle open={false} onToggle={() => setPanelOpen(true)} />
          </div>
        )}
        <CardCanvas />
      </div>
    </div>
  )
}
