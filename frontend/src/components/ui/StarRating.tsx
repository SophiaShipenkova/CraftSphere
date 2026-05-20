import { Star } from 'lucide-react'

type Props = {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: number
}

export function StarRating({ value, onChange, readonly = false, size = 18 }: Props) {
  return (
    <div className={`star-rating ${readonly ? 'star-rating--readonly' : ''}`} role={readonly ? 'img' : 'group'}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-rating__star ${star <= value ? 'is-filled' : ''}`}
          disabled={readonly}
          aria-label={`${star} из 5`}
          onClick={() => onChange?.(star)}
        >
          <Star size={size} fill={star <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}
