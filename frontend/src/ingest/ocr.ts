import i18n from '../i18n'
import { groupLines, type Box, type OcrLine } from './group'

const MAX_BYTES = 10 * 1024 * 1024

export function tidyOcrText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Tesseract skips light text on coloured badges (status pills, roadmap bars).
// Keep only near-white pixels that have colour on both sides, as black on white.
function isolateLightText(file: File): Promise<Blob> {
  const REACH = 12
  return createImageBitmap(file).then((bitmap) => {
    const { width, height } = bitmap
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    const src = ctx.getImageData(0, 0, width, height).data
    const out = new Uint8ClampedArray(src.length).fill(255)
    const coloured = new Int32Array(width + 1)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const spread =
          Math.max(src[i], src[i + 1], src[i + 2]) - Math.min(src[i], src[i + 1], src[i + 2])
        coloured[x + 1] = coloured[x] + (spread > 60 ? 1 : 0)
      }
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        if (Math.min(src[i], src[i + 1], src[i + 2]) <= 200) continue
        const left = coloured[x] - coloured[Math.max(0, x - REACH)]
        const right = coloured[Math.min(width, x + REACH + 1)] - coloured[x + 1]
        if (left > 0 && right > 0) out[i] = out[i + 1] = out[i + 2] = 0
      }
    }
    ctx.putImageData(new ImageData(out, width, height), 0, 0)
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error(i18n.t('errors.imageProcess', { name: file.name }))),
        'image/png',
      ),
    )
  })
}

function linesOf(data: { blocks: { paragraphs: { lines: OcrLine[] }[] }[] | null }): OcrLine[] {
  return (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
}

type Worker = Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>

// one worker for the whole page: starting one loads the WASM and the language model again
let worker: Promise<Worker> | null = null

function getWorker(): Promise<Worker> {
  worker ??= import('tesseract.js')
    .then(({ createWorker }) => createWorker('eng'))
    .catch((cause) => {
      // a failed start (e.g. offline) must not stick, so the next image tries again
      worker = null
      throw cause
    })
  return worker
}

export async function readImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error(
      i18n.t('errors.imageTooLarge', { name: file.name, size: Math.round(file.size / 1_000_000) }),
    )
  }

  const ocr = await getWorker()
  const lines = linesOf((await ocr.recognize(file, {}, { blocks: true })).data)
  const badges = await isolateLightText(file)
  for (const line of linesOf((await ocr.recognize(badges, {}, { blocks: true })).data)) {
    if (!lines.some((seen) => overlaps(seen.bbox, line.bbox))) lines.push(line)
  }
  lines.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
  return tidyOcrText(groupLines(lines))
}
