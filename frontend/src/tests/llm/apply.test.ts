import { describe, expect, it } from 'vitest'

import { applyValue, currentValue, isEmptyValue, removeEmptyBlock } from '../../llm/apply'
import { PENDING, placeholderCard } from '../fixtures'

const dataOf = (card: ReturnType<typeof placeholderCard>, id: string) =>
  card.blocks.find((b) => b.id === id)!.data

describe('applyValue', () => {
  it('writes the title to the header and the card', () => {
    const card = applyValue(placeholderCard(), PENDING, 'title', 'Atlas')

    expect(dataOf(card, 'h').project_name).toBe('Atlas')
    expect(card.project_name).toBe('Atlas')
  })

  it('writes the status label and tone and updates the card status', () => {
    const card = applyValue(placeholderCard(), PENDING, 'status', 'at_risk')

    expect(dataOf(card, 'st')).toEqual({ label: 'At risk', tone: 'at_risk' })
    expect(card.status).toBe('at_risk')
  })

  it('ignores a status that is still arriving', () => {
    const card = applyValue(placeholderCard(), PENDING, 'status', 'at_r')

    expect(card.status).toBe('on_track')
  })

  it('writes the summary text', () => {
    const card = applyValue(placeholderCard(), PENDING, 'summary', 'Done early.')

    expect(dataOf(card, 'sm').text).toBe('Done early.')
  })

  it('writes complete KPI rows and skips rows still arriving', () => {
    const rows = [{ label: 'Latency', value: '44%' }, { label: 'Err' }]

    const card = applyValue(placeholderCard(), PENDING, 'kpi', rows)

    expect(dataOf(card, 'kpi').metrics).toEqual([{ label: 'Latency', value: '44%' }])
  })

  it('writes list items', () => {
    const card = applyValue(placeholderCard(), PENDING, 'risks', ['Vendor late'])

    expect(dataOf(card, 'r').items).toEqual(['Vendor late'])
  })
})

describe('removeEmptyBlock', () => {
  it('drops the block and renumbers order', () => {
    const card = removeEmptyBlock(placeholderCard(), PENDING, 'summary')

    expect(card.blocks.find((b) => b.id === 'sm')).toBeUndefined()
    expect(card.blocks.map((b) => b.order)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('isEmptyValue', () => {
  it.each([
    ['', true],
    ['  ', true],
    [[], true],
    ['text', false],
    [['a'], false],
  ])('%j is empty: %s', (value, expected) => {
    expect(isEmptyValue(value)).toBe(expected)
  })
})

describe('currentValue', () => {
  it('reads each field back in the shape the model returns it', () => {
    let card = placeholderCard()
    card = applyValue(card, PENDING, 'title', 'Atlas')
    card = applyValue(card, PENDING, 'status', 'at_risk')
    card = applyValue(card, PENDING, 'summary', 'Done early.')
    card = applyValue(card, PENDING, 'kpi', [{ label: 'Latency', value: '44%' }])
    card = applyValue(card, PENDING, 'risks', ['Vendor late'])

    expect(currentValue(card, PENDING, 'title')).toBe('Atlas')
    expect(currentValue(card, PENDING, 'status')).toBe('at_risk')
    expect(currentValue(card, PENDING, 'summary')).toBe('Done early.')
    expect(currentValue(card, PENDING, 'kpi')).toEqual([{ label: 'Latency', value: '44%' }])
    expect(currentValue(card, PENDING, 'risks')).toEqual(['Vendor late'])
  })

  it('is null for a block that is no longer on the card', () => {
    const card = removeEmptyBlock(placeholderCard(), PENDING, 'summary')

    expect(currentValue(card, PENDING, 'summary')).toBeNull()
  })
})
