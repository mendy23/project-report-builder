import { describe, expect, it } from 'vitest'

import { noteLines } from '../../export/note'

describe('noteLines', () => {
  it('turns "- " lines into bullets, keeps other lines as text, drops blank lines', () => {
    expect(noteLines('Intro\n\n- one\n• two')).toEqual([
      { bullet: false, text: 'Intro' },
      { bullet: true, text: 'one' },
      { bullet: true, text: 'two' },
    ])
  })
})
