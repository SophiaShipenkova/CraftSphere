import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'

import { api, resolveMediaUrl, Seller } from '../../shared/api'
import { useAuthStore } from '../../store/auth'

type Props = {
  seller: Seller
  subscribed: boolean
  isOwner?: boolean
  onSubscribeChange: (v: boolean) => void
}

export function SellerHeader({ seller, subscribed, isOwner, onSubscribeChange }: Props) {
  const token = useAuthStore((s) => s.token)

  async function toggleSubscribe() {
    if (!token) {
      window.location.href = '/login'
      return
    }
    try {
      if (subscribed) {
        await api.unsubscribe(seller.id)
        onSubscribeChange(false)
      } else {
        await api.subscribe(seller.id)
        onSubscribeChange(true)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="seller-header">
      <div className="seller-header__cover">
        {seller.cover_image ? (
          <img src={resolveMediaUrl(seller.cover_image)} alt="" />
        ) : (
          <div className="seller-header__cover-placeholder" />
        )}
      </div>
      <div className="seller-header__profile">
        <div className="seller-header__avatar">
          {seller.avatar ? (
            <img src={resolveMediaUrl(seller.avatar)} alt={seller.name} />
          ) : (
            <span className="seller-header__avatar-placeholder">
              {(seller.name.trim().charAt(0) || '?').toUpperCase()}
            </span>
          )}
        </div>
        <div className="seller-header__info">
          <h1>{seller.name}</h1>
          {seller.location && <p className="muted">{seller.location}</p>}
          {isOwner ? (
            <Link to="/seller" className="btn">
              <Settings size={16} /> Управление витриной
            </Link>
          ) : (
            <button type="button" className="btn" onClick={toggleSubscribe}>
              {subscribed ? 'Вы подписаны' : 'Подписаться'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
