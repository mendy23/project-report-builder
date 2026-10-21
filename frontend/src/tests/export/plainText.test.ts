import { describe, expect, it } from 'vitest'

import { ALL_TYPES, MUST_APPEAR, block, fixtureCard } from './cardFixture'
import { renderPlainText } from '../../export/plainText'

describe('renderPlainText', () => {
  it('renders every block type', () => {
    const text = renderPlainText(fixtureCard())
    const missing = ALL_TYPES.filter((t) => !text.includes(MUST_APPEAR[t]))
    expect(missing, `no renderer yet for: ${missing.join(', ')}`).toEqual([])
  })

  it('contains no markup', () => {
    expect(renderPlainText(fixtureCard())).not.toMatch(/<[a-z/][^>]*>/i)
  })

  it('puts blocks in order', () => {
    const card = fixtureCard()
    card.blocks = [block('kpi', 1), block('header', 0)]
    const text = renderPlainText(card)
    expect(text.indexOf('Atlas Migration')).toBeLessThan(text.indexOf('180 ms'))
  })

  it('states the status as a word', () => {
    expect(renderPlainText(fixtureCard())).toContain('Shipping on schedule')
  })
})
