import { describe, expect, it } from 'vitest'

import { clearPending, dragIn, emptyLists, excludePhrase, undoPending } from '../../store/keywords'

describe('dragIn', () => {
  it('marks a keyword as included and pending, once', () => {
    const lists = dragIn(dragIn(emptyLists(), 'risks', 'x'), 'risks', 'x')

    expect(lists.risks).toEqual({ include: ['x'], exclude: [], pending: ['x'] })
  })

  it('lifts an earlier exclusion of that keyword', () => {
    const lists = dragIn(excludePhrase(emptyLists(), 'risks', 'x'), 'risks', 'x')

    expect(lists.risks).toMatchObject({ include: ['x'], exclude: [] })
  })
})

describe('undoPending', () => {
  it('removes the chip from include and pending and returns it to exclude', () => {
    const lists = undoPending(dragIn(emptyLists(), 'summary', 'y'), 'summary', 'y')

    expect(lists.summary).toMatchObject({ include: [], exclude: ['y'], pending: [] })
  })
})

describe('excludePhrase', () => {
  it('adds the phrase to exclude', () => {
    const lists = excludePhrase(emptyLists(), 'summary', 'which delays the rollout')

    expect(lists.summary.exclude).toEqual(['which delays the rollout'])
  })
})

describe('excludePhrase and an identical keyword', () => {
  it('takes the same text out of include and pending so it is never both', () => {
    const lists = excludePhrase(
      dragIn(emptyLists(), 'summary', 'Vendor unsigned'),
      'summary',
      'Vendor unsigned',
    )

    expect(lists.summary).toMatchObject({ include: [], exclude: ['Vendor unsigned'], pending: [] })
  })
})

describe('clearPending', () => {
  it('empties pending but keeps include', () => {
    const lists = clearPending(dragIn(emptyLists(), 'summary', 'y'), 'summary')

    expect(lists.summary).toMatchObject({ include: ['y'], exclude: [], pending: [] })
  })
})

it('never mutates the lists it is given', () => {
  const before = emptyLists()

  dragIn(before, 'risks', 'x')

  expect(before.risks.include).toEqual([])
})
