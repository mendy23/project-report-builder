import type { Card } from '../types'
import { renderEmailHtml } from './emailHtml'
import { renderPlainText } from './plainText'
import { renderPng } from './png'

export type CopyFormat = 'html' | 'png' | 'text'

export async function copyCard(card: Card, format: CopyFormat): Promise<void> {
  const blobs: Record<CopyFormat, () => Promise<Blob>> = {
    html: async () => new Blob([await renderEmailHtml(card)], { type: 'text/html' }),
    text: async () => new Blob([renderPlainText(card)], { type: 'text/plain' }),
    png: () => renderPng(card),
  }
  const type = { html: 'text/html', text: 'text/plain', png: 'image/png' }[format]

  // Safari kills the gesture if we await before constructing ClipboardItem
  const item = new ClipboardItem({ [type]: blobs[format]() })
  await navigator.clipboard.write([item])
}
