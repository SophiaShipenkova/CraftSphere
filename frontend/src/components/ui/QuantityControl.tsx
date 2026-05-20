import { useEffect, useState } from 'react'

type Props = {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function QuantityControl({ value, min = 1, max, onChange, disabled }: Props) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(raw: string) {
    const parsed = parseInt(raw, 10)
    if (!raw || Number.isNaN(parsed)) {
      setDraft(String(value))
      return
    }
    onChange(Math.min(max, Math.max(min, parsed)))
  }

  return (
    <div className="qty-control" role="group" aria-label="Количество">
      <button
        type="button"
        className="qty-control__btn"
        disabled={disabled || value <= min}
        aria-label="Уменьшить"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <input
        className="qty-control__input"
        value={draft}
        disabled={disabled}
        inputMode="numeric"
        aria-label="Количество"
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      <button
        type="button"
        className="qty-control__btn"
        disabled={disabled || value >= max}
        aria-label="Увеличить"
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  )
}
