import { ShoppingCart } from 'lucide-react'

import { api } from '../../shared/api'
import { notifyCartUpdated } from '../../shared/cartEvents'
import { useAuthStore } from '../../store/auth'
import { QuantityControl } from '../ui/QuantityControl'

type Props = {
  productId: number
  stock: number
  cartQty: number
  onCartChange: (qty: number) => void
}

export function ProductCartActions({ productId, stock, cartQty, onCartChange }: Props) {
  const token = useAuthStore((s) => s.token)
  const outOfStock = stock < 1

  async function addOne() {
    if (!token) {
      window.location.href = '/login'
      return
    }
    await api.addToCart(productId, 1)
    notifyCartUpdated()
    onCartChange(cartQty + 1)
  }

  async function changeQty(next: number) {
    if (!token) return
    if (next <= 0) {
      await api.removeFromCart(productId)
      notifyCartUpdated()
      onCartChange(0)
      return
    }
    const capped = Math.min(next, stock)
    await api.updateCart(productId, capped)
    notifyCartUpdated()
    onCartChange(capped)
  }

  if (outOfStock) {
    return <p className="product-detail__unavailable">Нет в наличии</p>
  }

  if (cartQty > 0) {
    return (
      <div className="product-detail__cart-actions">
        <QuantityControl value={cartQty} max={stock} onChange={changeQty} />
        <span className="muted product-detail__in-cart">В корзине</span>
      </div>
    )
  }

  return (
    <button type="button" className="btn btn-wide product-detail__add-btn" onClick={addOne}>
      <ShoppingCart size={18} /> В корзину
    </button>
  )
}
