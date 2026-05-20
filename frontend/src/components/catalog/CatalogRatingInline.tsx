import { Star } from 'lucide-react'

type Props = {
  avgRating: number
  starSize?: number
  className?: string
  /** catalog — контур звезды цветом акцента; neutral — контур как основной текст темы (страница товара/услуги) */
  variant?: 'catalog' | 'neutral'
}

/** Дробь «N,N/5» и звезда справа — для компактных карточек каталога. */
export function CatalogRatingInline({ avgRating, starSize = 14, className, variant = 'catalog' }: Props) {
  const frac = avgRating.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const toneClass = variant === 'neutral' ? ' catalog-rating-inline--neutral' : ''
  return (
    <span
      className={`catalog-rating-inline${toneClass}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`Средняя оценка ${frac} из 5`}
    >
      <span className="catalog-rating-inline__fraction" aria-hidden>
        {frac}/5
      </span>
      <Star size={starSize} className="catalog-rating-inline__star" strokeWidth={2} fill="none" aria-hidden />
    </span>
  )
}
