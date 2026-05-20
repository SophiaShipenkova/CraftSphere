import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { CatalogSpotlightCard } from '../components/catalog/CatalogSpotlightCard'
import { SellerHeader } from '../components/seller/SellerHeader'
import { TabBar } from '../components/ui/TabBar'
import { api, Me, Showcase } from '../shared/api'
import { useAuthStore } from '../store/auth'

const TABS = [
  { id: 'about', label: 'О мастере' },
  { id: 'products', label: 'Товары' },
  { id: 'services', label: 'Мастер-классы' },
  { id: 'blog', label: 'Блог' }
]

export function SellerPage() {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'products'
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState<Showcase | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    if (!params.id) return
    api.showcase(Number(params.id)).then((d) => {
      setData(d)
      setSubscribed(d.seller.subscribed ?? false)
    }).catch(console.error)
  }, [params.id])

  useEffect(() => {
    if (!token) {
      setMe(null)
      return
    }
    api.me().then(setMe).catch(() => setMe(null))
  }, [token])

  if (!data) return <div className="container section card">Загрузка витрины...</div>

  return (
    <div className="container section seller-page">
      <SellerHeader
        seller={data.seller}
        subscribed={subscribed}
        isOwner={me?.seller_profile_id === data.seller.id}
        onSubscribeChange={setSubscribed}
      />
      <TabBar tabs={TABS} active={tab} onChange={(id) => setSearchParams({ tab: id })} />

      {tab === 'about' && (
        <div className="card seller-about">
          <p>{data.seller.description}</p>
          {data.seller.location && <p className="muted">📍 {data.seller.location}</p>}
        </div>
      )}

      {tab === 'products' && (
        <div className="cards-grid home-cards-grid">
          {data.products.map((p) => (
            <CatalogSpotlightCard
              key={p.id}
              kind="product"
              id={p.id}
              title={p.title}
              description={p.description}
              price={p.price}
              images={p.images ?? []}
              tags={p.tags}
              avg_rating={p.avg_rating}
              showCart
            />
          ))}
        </div>
      )}

      {tab === 'services' && (
        <div className="cards-grid home-cards-grid">
          {data.services.map((s) => (
            <CatalogSpotlightCard
              key={s.id}
              kind="service"
              id={s.id}
              title={s.title}
              description={s.description}
              price={s.price}
              images={s.images ?? []}
              tags={s.tags}
              avg_rating={s.avg_rating}
              duration={s.duration}
            />
          ))}
        </div>
      )}

      {tab === 'blog' && (
        <div className="blog-list">
          {data.blog_posts.map((post) => (
            <article key={post.id} className="card blog-post-preview">
              <h3>{post.title}</h3>
              <p className="muted">{new Date(post.created_at).toLocaleDateString('ru-RU')}</p>
              <p>{post.content.slice(0, 200)}{post.content.length > 200 ? '…' : ''}</p>
              <Link to={`/stories/${post.id}`}>Читать</Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
