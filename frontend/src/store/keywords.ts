import type { BlockField, BlockLists } from '../types'

export type Lists = Record<BlockField, BlockLists>

const FIELDS: BlockField[] = ['title', 'status', 'summary', 'kpi', 'risks', 'next_steps']

export const emptyLists = (): Lists =>
  Object.fromEntries(
    FIELDS.map((field) => [field, { include: [], exclude: [], pending: [] }]),
  ) as unknown as Lists

const withoutText = (items: string[], text: string) => items.filter((item) => item !== text)
const withText = (items: string[], text: string) =>
  items.includes(text) ? items : [...items, text]

function update(lists: Lists, field: BlockField, change: Partial<BlockLists>): Lists {
  return { ...lists, [field]: { ...lists[field], ...change } }
}

export function dragIn(lists: Lists, field: BlockField, text: string): Lists {
  const current = lists[field]
  return update(lists, field, {
    include: withText(current.include, text),
    exclude: withoutText(current.exclude, text),
    pending: withText(current.pending, text),
  })
}

export function undoPending(lists: Lists, field: BlockField, text: string): Lists {
  const current = lists[field]
  return update(lists, field, {
    include: withoutText(current.include, text),
    exclude: withText(current.exclude, text),
    pending: withoutText(current.pending, text),
  })
}

export function excludePhrase(lists: Lists, field: BlockField, phrase: string): Lists {
  const current = lists[field]
  return update(lists, field, {
    include: withoutText(current.include, phrase),
    exclude: withText(current.exclude, phrase),
    pending: withoutText(current.pending, phrase),
  })
}

export function clearPending(lists: Lists, field: BlockField): Lists {
  return update(lists, field, { pending: [] })
}
