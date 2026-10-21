import type { BlockField } from '../types'

const LIST_FIELDS: BlockField[] = ['risks', 'next_steps']

const cut = (text: string, phrase: string) => text.replace(phrase, '').replace(/\s+/g, ' ').trim()

export function removePhrase(
  data: Record<string, unknown>,
  field: BlockField,
  phrase: string,
): Record<string, unknown> {
  if (field === 'summary') {
    const text = data.text as string
    return text.includes(phrase) ? { ...data, text: cut(text, phrase) } : data
  }
  if (LIST_FIELDS.includes(field)) {
    const items = data.items as string[]
    const index = items.findIndex((item) => item.includes(phrase))
    if (index === -1) return data
    const cutItem = cut(items[index], phrase)
    const next = items.flatMap((item, i) => (i !== index ? [item] : cutItem ? [cutItem] : []))
    return { ...data, items: next }
  }
  return data
}
