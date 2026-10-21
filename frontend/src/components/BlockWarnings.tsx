import { useCardStore } from '../store'

export default function BlockWarnings({ blockId }: { blockId: string }) {
  const llm = useCardStore((s) => s.llm)
  const field = Object.keys(llm.pending).find((key) => llm.pending[key] === blockId)
  const messages = field ? (llm.warnings[field] ?? []) : []

  if (messages.length === 0) return null
  return (
    <ul className="mt-1 space-y-1 text-xs text-amber-800">
      {messages.map((message) => (
        <li key={message} className="flex items-start gap-1.5">
          <svg
            viewBox="0 0 16 16"
            className="mt-px size-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M8 2 1.5 13.5h13L8 2Z" />
            <path d="M8 6.5v3.2M8 11.7v.1" />
          </svg>
          <span>{message}</span>
        </li>
      ))}
    </ul>
  )
}
