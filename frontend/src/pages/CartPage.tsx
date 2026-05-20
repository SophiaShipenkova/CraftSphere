import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { QuantityControl } from '../components/ui/QuantityControl'
import { api, Order, resolveMediaUrl } from '../shared/api'
import { notifyCartUpdated } from '../shared/cartEvents'
import { useAuthStore } from '../store/auth'

export function CartPage() {
  const token = useAuthStore((s) => s.token)
  const [cart, setCart] = useState<Awaited<ReturnType<typeof api.cart>> | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  function reload() {
    if (!token) return
    return api.cart().then((data) => {
      setCart(data)
      notifyCartUpdated()
    }).catch(console.error)
  }

  useEffect(() => {
    if (!token) return
    reload()
  }, [token])

  if (!token) {
    return (
      <div className="container section card">
        <p>Войдите, чтобы увидеть корзину.</p>
        <Link className="btn" to="/login">Вход</Link>
      </div>
    )
  }

  async function changeQuantity(productId: number, next: number, stock: number) {
    setUpdatingId(productId)
    try {
      if (next < 1) {
        await api.removeFromCart(productId)
      } else {
        await api.updateCart(productId, Math.min(next, stock))
      }
      await reload()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Не удалось обновить количество')
    } finally {
      setUpdatingId(null)
    }
  }

  async function checkout() {
    try {
      const created = await api.createOrder()
      setOrder(created)
      setMessage('Заказ создан. Можно перейти к оплате (демо).')
      await reload()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка оформления')
    }
  }

  async function pay() {
    if (!order) return
    try {
      const paid = await api.payOrder(order.id)
      setOrder(paid)
      setMessage('Демо-оплата прошла успешно.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка оплаты')
    }
  }

  return (
    <div className="container section cart-page">
      <h1>Корзина</h1>
      {message && <p className="notice">{message}</p>}

      {!cart?.items.length && !order && <p>Корзина пуста. <Link to="/products">Перейти в каталог</Link></p>}

      <div className="cart-list">
        {cart?.items.map((item) => {
          const lineTotal = item.price * item.quantity
          return (
            <article key={item.product_id} className="cart-row card">
              <Link to={`/products/${item.product_id}`} className="cart-row__media">
                {item.image ? (
                  <img src={resolveMediaUrl(item.image)} alt="" className="cart-row__img" />
                ) : (
                  <div className="card-image card-image--empty">Нет фото</div>
                )}
              </Link>
              <div className="cart-row__info">
                <Link to={`/products/${item.product_id}`} className="cart-row__title">
                  <strong>{item.title}</strong>
                </Link>
                <div className="muted">{item.price.toLocaleString('ru-RU')} ₽ за шт.</div>
                <QuantityControl
                  value={item.quantity}
                  min={0}
                  max={item.stock}
                  disabled={updatingId === item.product_id}
                  onChange={(next) => changeQuantity(item.product_id, next, item.stock)}
                />
                <div className="cart-row__stock muted">В наличии: {item.stock} шт.</div>
              </div>
              <div className="cart-row__aside">
                <strong className="cart-row__sum">{lineTotal.toLocaleString('ru-RU')} ₽</strong>
                <button
                  type="button"
                  className="btn-ghost cart-row__remove"
                  disabled={updatingId === item.product_id}
                  onClick={() => changeQuantity(item.product_id, 0, item.stock)}
                >
                  Удалить
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {cart && cart.items.length > 0 && (
        <div className="cart-summary card">
          <strong>Итого: {cart.total.toLocaleString('ru-RU')} ₽</strong>
          <button type="button" className="btn" onClick={checkout}>
            Оформить заказ
          </button>
        </div>
      )}

      {order && order.status === 'pending_payment' && (
        <div className="card">
          <p>Заказ #{order.id} ожидает оплаты.</p>
          <button type="button" className="btn" onClick={pay}>
            Оплатить (демо)
          </button>
        </div>
      )}
    </div>
  )
}
