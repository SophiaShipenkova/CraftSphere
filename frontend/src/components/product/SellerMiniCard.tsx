import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { resolveMediaUrl, Seller } from '../../shared/api'

type Props = { seller: Seller }

export function SellerMiniCard({ seller }: Props) {
  const initial = seller.name.trim().charAt(0).toUpperCase() || 'М'

  return (
    <Link to={`/sellers/${seller.id}`} className="seller-mini-card">
      {seller.avatar ? (
        <img src={resolveMediaUrl(seller.avatar)} alt="" className="seller-mini-card__avatar" />
      ) : (
        <span className="seller-mini-card__avatar seller-mini-card__avatar--placeholder">{initial}</span>
      )}
      <div className="seller-mini-card__body">
        <strong>{seller.name}</strong>
        {seller.location && <span className="muted">{seller.location}</span>}
        {seller.description && <p className="seller-mini-card__desc">{seller.description}</p>}
      </div>
      <ChevronRight size={18} className="seller-mini-card__chevron" />
    </Link>
  )
}
