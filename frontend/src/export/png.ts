import { toPng } from 'html-to-image'

import type { Card } from '../types'
import { renderEmailHtml } from './emailHtml'
import { CARD_WIDTH_PX } from './tokens'

// html-to-image always returns base64; Response.blob() is unreliable in jsdom
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',')
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: header.slice(5, header.indexOf(';')) })
}

// The card sits at the origin and a 0×0 overflow-hidden parent hides it.
// Do NOT switch to left:-9999px — html-to-image clones into a foreignObject
// and paints at the clone's coordinates, so an off-screen node produces a
// correctly sized but completely transparent PNG.
export async function renderPng(card: Card, scale = 2): Promise<Blob> {
  const html = await renderEmailHtml(card)

  const clip = document.createElement('div')
  clip.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:hidden'

  const container = document.createElement('div')
  container.style.cssText = `width:${CARD_WIDTH_PX}px`
  container.innerHTML = html

  clip.appendChild(container)
  document.body.appendChild(clip)

  try {
    // the card is measured when capture starts, so chart images must have loaded by then
    // jsdom has no decode(); a background tab can stall it, so wait at most 2s
    const settle = (img: HTMLImageElement) =>
      Promise.race([
        Promise.resolve(img.decode?.()).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ])
    await Promise.all([...container.querySelectorAll('img')].map(settle))
    // WebKit leaves images blank on the first foreignObject draw; this throwaway pass decodes them
    await toPng(container, { pixelRatio: scale })
    const dataUrl = await toPng(container, { pixelRatio: scale })
    return dataUrlToBlob(dataUrl)
  } finally {
    clip.remove()
  }
}
