import { describe, expect, it } from 'vitest'

import { removePhrase } from '../../llm/text'

describe('removePhrase', () => {
  it('cuts the first of two occurrences from a summary', () => {
    const data = { text: 'Late again. Late again.' }

    expect(removePhrase(data, 'summary', 'Late again.')).toEqual({ text: 'Late again.' })
  })

  it('cleans up the gap the phrase leaves behind', () => {
    expect(removePhrase({ text: 'A b c' }, 'summary', 'b')).toEqual({ text: 'A c' })
  })

  it('leaves the data unchanged when the phrase is not in the text', () => {
    const data = { text: 'Nothing here' }

    expect(removePhrase(data, 'summary', 'missing')).toBe(data)
  })

  it('cuts the phrase from the first list item that contains it', () => {
    const data = { title: 'Risks', items: ['Vendor late', 'Budget tight and vendor late'] }

    expect(removePhrase(data, 'risks', 'vendor late')).toEqual({
      title: 'Risks',
      items: ['Vendor late', 'Budget tight and'],
    })
  })

  it('removes a list item that becomes blank', () => {
    const data = { title: 'Risks', items: ['Vendor late', 'Budget tight'] }

    expect(removePhrase(data, 'risks', 'Vendor late').items).toEqual(['Budget tight'])
  })

  it('does not touch blocks that are not text blocks', () => {
    const data = { metrics: [{ label: 'a', value: '1' }] }

    expect(removePhrase(data, 'kpi', 'a')).toBe(data)
  })
})
