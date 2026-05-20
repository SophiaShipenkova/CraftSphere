import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

import { api, resolveMediaUrl } from '../../shared/api'
import { notifyCartUpdated } from '../../shared/cartEvents'
import { useAuthStore } from '../../store/auth'
import { CatalogRatingInline } from './CatalogRatingInline'
import { TagSearchChip } from './TagSearchChip'

export type CatalogSpotlightCardProps = {
  kind: 'product' | 'service'
  id: number
  title: string
  description: string
  price: number
  images: string[]
  tags: string[]
  avg_rating?: number | null
  duration?: number
  onPhotoOpen?: (images: string[], index: number) => void
  /** Кнопка «в корзину» для товаров в каталоге / витрине */
  showCart?: boolean
  onCartAdded?: () => void
}

export function CatalogSpotlightCard({
  kind,
  id,
  title,
  description,
  price,
  images,
  tags,
  avg_rating: avgRating,
  duration,
  onPhotoOpen,
  showCart = false,
  onCartAdded,
}: CatalogSpotlightCardProps) {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const href = kind === 'product' ? `/products/${id}` : `/services/${id}`
  const kindLabel = kind === 'product' ? 'Товар' : 'МК'
  const chipCatalogType = kind === 'product' ? 'products' : 'services'
  const firstImage = images[0]
  const emptyPhotoLabel = kind === 'product' ? 'Фото скоро' : 'Фото'

  async function addToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!token) {
      window.location.href = '/login'
      return
    }
    try {
      await api.addToCart(id, 1)
      notifyCartUpdated()
      onCartAdded?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <article className="catalog-card catalog-card--home">
      <Link className="catalog-card__sheet" to={href} aria-label={`Открыть ${kind === 'product' ? 'товар' : 'мастер-класс'}: ${title}`} />
      <button
        type="button"
        className={`catalog-card__photo-btn${onPhotoOpen ? '' : ' catalog-card__photo-btn--nav'}`}
        aria-label={onPhotoOpen ? 'Открыть фото крупно' : `Открыть ${kind === 'product' ? 'товар' : 'мастер-класс'}`}
        disabled={!firstImage}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!firstImage) return
          if (onPhotoOpen) {
            onPhotoOpen(images, 0)
          } else {
            navigate(href)
          }
        }}
      >
        {firstImage ? (
          <img className="card-image" src={resolveMediaUrl(firstImage)} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="card-image card-image--empty">{emptyPhotoLabel}</div>
        )}
      </button>
      <div className="catalog-card__meta">
        <div className="card-top">
          <span className="chip">{kindLabel}</span>
          <div className="card-top-end">
            {avgRating != null && avgRating > 0 && <CatalogRatingInline avgRating={avgRating} starSize={15} />}
            <span className="price">{price.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
        <h3>{title}</h3>
        {description.trim().length > 0 && <p className="catalog-card__meta-desc">{description}</p>}
        {kind === 'service' && duration != null && (
          <div className="service-meta">
            <span>{duration} мин</span>
          </div>
        )}
      </div>
      <div className="catalog-card__chips chips">
        {tags.slice(0, 4).map((tag) => (
          <TagSearchChip key={tag} tag={tag} catalogType={chipCatalogType} />
        ))}
        {showCart && kind === 'product' && (
          <button type="button" className="catalog-card__quick-cart btn-icon-cart" onClick={addToCart} aria-label="В корзину">
            <ShoppingCart size={16} />
          </button>
        )}
      </div>
    </article>
  )
}
