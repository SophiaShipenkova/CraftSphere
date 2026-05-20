import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { SimilarItemsPanel } from '../components/catalog/SimilarItemsPanel'
import { useBreadcrumbLabel } from '../components/layout/BreadcrumbContext'
import { SellerMiniCard } from '../components/product/SellerMiniCard'
import { ReviewsSection } from '../components/reviews/ReviewsSection'
import { ScheduleCalendar } from '../components/service/ScheduleCalendar'
import { CatalogRatingInline } from '../components/catalog/CatalogRatingInline'
import { DetailPanel } from '../components/ui/DetailPanel'
import { api, resolveMediaUrl, ScheduleSlot, Seller, Service } from '../shared/api'

export function ServicePage() {
  const params = useParams()
  const [service, setService] = useState<Service | null>(null)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [slots, setSlots] = useState<ScheduleSlot[]>([])

  useBreadcrumbLabel(params.id, service?.title)

  function loadSchedule(id: number) {
    api.serviceSchedule(id).then(setSlots).catch(console.error)
  }

  useEffect(() => {
    if (!params.id) return
    const id = Number(params.id)
    api.service(id).then((s) => {
      setService(s)
      api.seller(s.seller_id).then(setSeller).catch(console.error)
      loadSchedule(id)
    }).catch(console.error)
  }, [params.id])

  if (!service) return <div className="container section card">Загрузка мастер-класса...</div>

  const images = service.images?.length ? service.images : []
  const image = images[0]
  const reviewCount = service.review_count ?? 0
  const avgRating = service.avg_rating

  return (
    <div className="container section product-detail-page">
      <DetailPanel
        image={
          image ? (
            <img src={resolveMediaUrl(image)} alt={service.title} className="detail-panel__img" />
          ) : (
            <div className="product-detail__media-empty">Нет фото</div>
          )
        }
      >
        <h1 className="product-detail__title">{service.title}</h1>
        {service.tags.length > 0 && (
          <div className="tag-chips">
            {service.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h2 className="detail-subtitle">О мастер-классе</h2>
        <p className="product-detail__description">{service.description}</p>
        {seller && <SellerMiniCard seller={seller} />}
        <div className="product-detail__commerce">
          <strong className="product-detail__price">{service.price.toLocaleString('ru-RU')} ₽</strong>
          <span className="stock-chip">{service.duration} мин</span>
          {reviewCount > 0 && avgRating != null && (
            <span className="product-detail__rating">
              <CatalogRatingInline avgRating={avgRating} starSize={18} variant="neutral" />
              <span className="product-detail__rating-reviews muted">· {reviewCount} отзывов</span>
            </span>
          )}
        </div>
        <p className="service-detail__schedule-hint muted">
          Выберите дату и время в расписании ниже, чтобы записаться.
        </p>
      </DetailPanel>

      <section id="schedule" className="section">
        <h2>Расписание</h2>
        <ScheduleCalendar slots={slots} onBooked={() => loadSchedule(service.id)} />
      </section>

      <ReviewsSection kind="service" entityId={service.id} />
      <SimilarItemsPanel kind="service" entityId={service.id} />
    </div>
  )
}
