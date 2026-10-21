import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readImage, tidyOcrText } from '../../ingest/ocr'

function pageOf(...texts: string[]) {
  const lines = texts.map((text, i) => ({
    text,
    bbox: { x0: 0, y0: i * 50, x1: 100, y1: i * 50 + 20 },
    words: [{ text, bbox: { x0: 0, y0: i * 50, x1: 100, y1: i * 50 + 20 } }],
  }))
  return { data: { blocks: [{ paragraphs: [{ lines }] }] } }
}

vi.stubGlobal('ImageData', class {})
vi.stubGlobal('createImageBitmap', async () => ({ width: 1, height: 1 }))
HTMLCanvasElement.prototype.getContext = (() => ({
  drawImage: () => {},
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData: () => {},
})) as never
HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
  cb(new Blob(['x']))
}

const recognize = vi.fn()
const terminate = vi.fn()

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => ({ recognize, terminate })),
}))

function imageFile(name = 'dashboard.png', type = 'image/png', size = 1024): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('readImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    recognize.mockResolvedValue(pageOf('Records migrated 1.4M'))
  })

  it('returns the recognised text, trimmed', async () => {
    await expect(readImage(imageFile())).resolves.toBe('Records migrated 1.4M')
  })

  it('rejects an oversized file before doing any work', async () => {
    const huge = imageFile('photo.jpg', 'image/jpeg', 11 * 1024 * 1024)

    await expect(readImage(huge)).rejects.toThrow('limit is 10MB')
    expect(recognize).not.toHaveBeenCalled()
  })

  it('propagates a recognition failure rather than returning an empty string', async () => {
    recognize.mockRejectedValue(new Error('worker died'))

    await expect(readImage(imageFile())).rejects.toThrow('worker died')
  })

  it('reuses one worker for every image instead of starting a new one', async () => {
    const { createWorker } = await import('tesseract.js')

    await readImage(imageFile('a.png'))
    await readImage(imageFile('b.png'))

    // the worker from an earlier test is still alive, so no new one starts at all
    expect(createWorker).not.toHaveBeenCalled()
    expect(terminate).not.toHaveBeenCalled()
  })
})

describe('tidyOcrText', () => {
  it('collapses repeated spaces and tabs to one space', () => {
    expect(tidyOcrText('a  b\t\tc')).toBe('a b c')
  })

  it('collapses runs of blank lines to a single blank line', () => {
    expect(tidyOcrText('x\n\n\n\ny')).toBe('x\n\ny')
  })

  it('trims every line', () => {
    expect(tidyOcrText('  one  \n   two')).toBe('one\ntwo')
  })

  it('is applied to recognised text', async () => {
    recognize.mockResolvedValue(pageOf('Records   migrated', '1.4M'))

    await expect(readImage(imageFile())).resolves.toBe('Records migrated\n1.4M')
  })
})
