import { KeyboardEvent, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

function normalizeTag(raw: string) {
  return raw.trim().toLowerCase().replace(/^#/, '')
}

export function TagInput({ tags, onChange, placeholder = 'Введите тег и нажмите Enter' }: Props) {
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const tag = normalizeTag(raw)
    if (!tag || tags.includes(tag)) {
      setInput('')
      return
    }
    onChange([...tags, tag])
    setInput('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="tag-input">
      <div className="tag-input__chips">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            #{tag}
            <button type="button" aria-label={`Удалить тег ${tag}`} onClick={() => onChange(tags.filter((t) => t !== tag))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="tag-input__field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>
      <small className="muted">Enter или запятая — добавить тег</small>
    </div>
  )
}
