import { Link } from 'react-router-dom'

import { CatalogItem, resolveMediaUrl } from '../../shared/api'
import { CatalogRatingInline } from './CatalogRatingInline'

type Props = { item: CatalogItem }

export function CompactCatalogCard({ item }: Props) {
  const href = item.kind === 'product' ? `/products/${item.id}` : `/services/${item.id}`
  const kindLabel = item.kind === 'product' ? 'Товар' : 'МК'

  return (
    <Link to={href} className="compact-card">
      {item.image ? (
        <img className="compact-card__img" src={resolveMediaUrl(item.image)} alt="" />
      ) : (
        <div className="compact-card__img compact-card__img--empty">Нет фото</div>
      )}
      <div className="compact-card__body">
        <span className="compact-card__kind">{kindLabel}</span>
        <h3 className="compact-card__title">{item.title}</h3>
        <div className="compact-card__meta">
          <span className="compact-card__price">{item.price.toLocaleString('ru-RU')} ₽</span>
          {item.avg_rating != null && item.avg_rating > 0 && (
            <CatalogRatingInline avgRating={item.avg_rating} starSize={13} className="compact-card__rating" />
          )}
        </div>
      </div>
    </Link>
  )
}
