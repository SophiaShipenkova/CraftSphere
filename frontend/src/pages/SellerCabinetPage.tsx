import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { SellerInventoryManager } from '../components/seller/SellerInventoryManager'
import { api, Enrollment, Me, Product, Service } from '../shared/api'
import { useAuthStore } from '../store/auth'

type SellerTab = 'profile' | 'products' | 'services'
type BuyerTab = 'profile' | 'cart' | 'events'

export function SellerCabinetPage() {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)

  const [me, setMe] = useState<Me | null>(null)
  const [message, setMessage] = useState('')
  const [sellerTab, setSellerTab] = useState<SellerTab>('profile')
  const [buyerTab, setBuyerTab] = useState<BuyerTab>('profile')

  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [displayName, setDisplayName] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [sellerDescription, setSellerDescription] = useState('')
  const [sellerLocation, setSellerLocation] = useState('')

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])

  useEffect(() => {
    if (!token) return
    api.me().then((data) => {
      setMe(data)
      setDisplayName(data.display_name ?? '')
      setSellerName(data.seller_name ?? '')
      setSellerDescription(data.seller_description ?? '')
      setSellerLocation(data.seller_location ?? '')
    }).catch(console.error)
  }, [token])

  async function refreshSellerData() {
    const [myProducts, myServices] = await Promise.all([api.myProducts(), api.myServices()])
    setProducts(myProducts)
    setServices(myServices)
  }

  useEffect(() => {
    if (me?.role === 'seller') refreshSellerData().catch(console.error)
    if (me?.role === 'buyer') api.enrollments().then(setEnrollments).catch(console.error)
  }, [me])

  useEffect(() => {
    if (location.pathname.endsWith('/products')) setSellerTab('products')
    else if (location.pathname.endsWith('/services')) setSellerTab('services')
    else if (location.pathname.endsWith('/events')) setBuyerTab('events')
    else if (location.pathname.endsWith('/cart')) setBuyerTab('cart')
    else {
      setSellerTab('profile')
      setBuyerTab('profile')
    }
  }, [location.pathname])

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault()
    if (!me) return
    try {
      const updated = await api.updateMe({
        display_name: displayName,
        seller_name: me.role === 'seller' ? sellerName : undefined,
        seller_description: me.role === 'seller' ? sellerDescription : undefined,
        seller_location: me.role === 'seller' ? sellerLocation : undefined
      })
      setMe(updated)
      setMessage('Профиль сохранён')
    } catch (err: unknown) {
      setMessage(`Ошибка: ${err instanceof Error ? err.message : 'неизвестная'}`)
    }
  }

  if (!token) {
    return <div className="container section card">Нужна авторизация. <Link to="/login">Войти</Link></div>
  }

  if (!me) {
    return <div className="container section card">Загрузка кабинета...</div>
  }

  const isSeller = me.role === 'seller'

  return (
    <div className="container section cabinet-page">
      <section className="dashboard-content">
        {message && <div className="cabinet-toast">{message}</div>}

        {((isSeller && sellerTab === 'profile') || (!isSeller && buyerTab === 'profile')) && (
          <form className="card cabinet-profile-form" onSubmit={onSaveProfile}>
            <h2>Данные профиля</h2>
            <div className="field-row">
              <label className="field">
                <span>Имя</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ваше имя" />
              </label>
              <label className="field">
                <span>Email</span>
                <input value={me.email} disabled />
              </label>
            </div>
            {isSeller && (
              <>
                <label className="field">
                  <span>Название студии</span>
                  <input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Leaves Studio" />
                </label>
                <label className="field">
                  <span>Описание</span>
                  <textarea
                    value={sellerDescription}
                    onChange={(e) => setSellerDescription(e.target.value)}
                    placeholder="Чем занимаетесь"
                    rows={4}
                  />
                </label>
                <label className="field">
                  <span>Город</span>
                  <input value={sellerLocation} onChange={(e) => setSellerLocation(e.target.value)} placeholder="Санкт-Петербург" />
                </label>
              </>
            )}
            <button type="submit" className="btn">Сохранить</button>
          </form>
        )}

        {isSeller && sellerTab === 'products' && (
          <SellerInventoryManager
            kind="product"
            items={products}
            showcaseSellerId={me.seller_profile_id}
            onRefresh={refreshSellerData}
          />
        )}

        {isSeller && sellerTab === 'services' && (
          <SellerInventoryManager
            kind="service"
            items={services}
            showcaseSellerId={me.seller_profile_id}
            onRefresh={refreshSellerData}
          />
        )}

        {!isSeller && buyerTab === 'cart' && (
          <div className="card">
            <h2>Корзина</h2>
            <p>Корзина доступна на отдельной странице.</p>
            <Link className="btn" to="/cart">Перейти в корзину</Link>
          </div>
        )}

        {!isSeller && buyerTab === 'events' && (
          <div className="card">
            <h2>Мои записи на мастер-классы</h2>
            {enrollments.length === 0 && <p>Вы пока не записаны на мастер-классы.</p>}
            {enrollments.map((event) => (
              <div key={event.id} className="list-row">
                <div>
                  <strong>{event.service_title}</strong>
                  <div>{new Date(event.start_time).toLocaleString('ru-RU')} — {event.location}</div>
                </div>
                <button
                  type="button"
                  onClick={() => api.cancelBooking(event.schedule_id).then(() => api.enrollments().then(setEnrollments))}
                >
                  Отменить
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
