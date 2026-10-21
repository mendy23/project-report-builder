export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrWord {
  text: string
  bbox: Box
}

export interface OcrLine {
  text: string
  bbox: Box
  words: OcrWord[]
}

interface Cell {
  text: string
  box: Box
}

// A gap wider than this many line-heights between words starts a new cell.
const CELL_GAP = 1.5
// A cell this close (in line-heights) under a group belongs to it.
const STACK_GAP = 1.5

function heightOf(box: Box): number {
  return box.y1 - box.y0
}

function splitCells(line: OcrLine): Cell[] {
  const height = line.bbox.y1 - line.bbox.y0
  const cells: Cell[] = []
  for (const word of line.words) {
    const last = cells[cells.length - 1]
    if (last && word.bbox.x0 - last.box.x1 < CELL_GAP * height) {
      last.text += ` ${word.text}`
      last.box = {
        x0: last.box.x0,
        x1: word.bbox.x1,
        y0: Math.min(last.box.y0, word.bbox.y0),
        y1: Math.max(last.box.y1, word.bbox.y1),
      }
    } else {
      cells.push({ text: word.text, box: { ...word.bbox } })
    }
  }
  return cells
}

// OCR reads row by row. In a card or grid layout that scatters one card's label,
// value and note across three lines, so stack cells that sit under each other
// and join them with commas. Plain text (no line with side-by-side cells) is
// returned line by line, untouched.
export function groupLines(lines: OcrLine[]): string {
  const rows = lines.map(splitCells)
  if (!rows.some((cells) => cells.length > 1)) {
    return lines.map((line) => line.text.trim()).join('\n')
  }

  const groups: { texts: string[]; box: Box; last: Box }[] = []
  for (const cell of rows.flat()) {
    const above = groups
      .filter(
        (g) =>
          cell.box.y0 - g.box.y1 < STACK_GAP * Math.max(heightOf(cell.box), heightOf(g.last)) &&
          cell.box.y0 >= g.box.y1 &&
          cell.box.x0 < g.box.x1 &&
          cell.box.x1 > g.box.x0,
      )
      .sort((a, b) => b.box.y1 - a.box.y1)[0]
    if (above) {
      above.texts.push(cell.text)
      above.last = cell.box
      above.box = {
        x0: Math.min(above.box.x0, cell.box.x0),
        x1: Math.max(above.box.x1, cell.box.x1),
        y0: above.box.y0,
        y1: cell.box.y1,
      }
    } else {
      groups.push({ texts: [cell.text], box: { ...cell.box }, last: cell.box })
    }
  }
  return groups.map((g) => g.texts.join(', ')).join('\n')
}
