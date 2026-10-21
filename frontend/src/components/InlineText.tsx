interface Props {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  readOnly?: boolean
  autoFocus?: boolean
  onEnter?: () => void
  onBackspaceEmpty?: () => void
  style?: React.CSSProperties
}

// looks like the text it replaces; field-sizing makes the textarea grow with its content
export default function InlineText({
  value,
  onChange,
  label,
  placeholder,
  readOnly,
  autoFocus,
  onEnter,
  onBackspaceEmpty,
  style,
}: Props) {
  return (
    <textarea
      aria-label={label}
      rows={1}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEnter) {
          e.preventDefault()
          onEnter()
        } else if (e.key === 'Backspace' && value === '' && onBackspaceEmpty) {
          e.preventDefault()
          onBackspaceEmpty()
        }
      }}
      className="m-0 block w-full resize-none border-0 bg-transparent p-0 outline-none field-sizing-content placeholder:text-slate-400"
      style={style}
    />
  )
}
