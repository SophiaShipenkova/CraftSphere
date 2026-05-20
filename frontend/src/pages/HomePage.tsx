import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Compass, HeartHandshake, MapPin, ShoppingBag, Sparkles, X } from 'lucide-react'

import { CatalogSpotlightCard } from '../components/catalog/CatalogSpotlightCard'
import { api, resolveMediaUrl } from '../shared/api'
import { HeroScene } from '../widgets/hero/HeroScene'

type HomeData = {
  popular_services: Array<{
    id: number
    title: string
    description: string
    price: number
    duration: number
    images: string[]
    tags: string[]
    avg_rating?: number | null
    review_count?: number
  }>
  new_products: Array<{
    id: number
    title: string
    description: string
    price: number
    images: string[]
    tags: string[]
    avg_rating?: number | null
    review_count?: number
  }>
  stories: Array<{ id: number; title: string; content: string }>
  nearby_sellers: Array<{ id: number; name: string; description: string; location: string | null }>
}

function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex)
  const current = images[index]

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        <X size={18} />
      </button>
      {images.length > 1 && (
        <>
          <button className="lightbox-nav left" onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + images.length) % images.length) }}>‹</button>
          <button className="lightbox-nav right" onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % images.length) }}>›</button>
        </>
      )}
      <img src={resolveMediaUrl(current)} alt="preview" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

export function HomePage() {
  const [data, setData] = useState<HomeData | null>(null)
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null)

  useEffect(() => {
    api.home().then(setData).catch(console.error)
  }, [])

  const productCards = useMemo(() => data?.new_products ?? [], [data])
  const serviceCards = useMemo(() => data?.popular_services ?? [], [data])

  return (
    <>
      <section className="hero-immersive">
        <HeroScene />
        <div className="hero-sphere-atmosphere" aria-hidden>
          <div className="hero-sphere-atmosphere__blob hero-sphere-atmosphere__blob--a" />
          <div className="hero-sphere-atmosphere__blob hero-sphere-atmosphere__blob--b" />
          <div className="hero-sphere-atmosphere__blob hero-sphere-atmosphere__blob--c" />
        </div>
        <div className="hero-overlay container">
          <div className="hero-overlay__copy">
            <p className="eyebrow dark">
              <Sparkles size={14} /> Маркетплейс handmade
            </p>
            <h1>CraftSphere</h1>
            <p>Покупайте handmade и записывайтесь на мастер-классы у местных мастеров — всё в одном месте.</p>
            <div className="hero__actions">
              <Link className="btn" to="/search">
                Исследовать каталог <ArrowRight size={16} />
              </Link>
              <Link className="btn btn-ghost dark" to="/register">
                Стать мастером
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container section quick-stats home-quick-stats">
        <div className="stat-card">
          <span className="stat-card__icon" aria-hidden><ShoppingBag size={18} strokeWidth={2} /></span>
          <div className="stat-card__body"><strong>{data?.new_products?.length ?? 0}+</strong><span>Новых товаров недели</span></div>
        </div>
        <div className="stat-card">
          <span className="stat-card__icon" aria-hidden><BookOpen size={18} strokeWidth={2} /></span>
          <div className="stat-card__body"><strong>{data?.popular_services?.length ?? 0}+</strong><span>Актуальных мастер-классов</span></div>
        </div>
        <div className="stat-card">
          <span className="stat-card__icon" aria-hidden><Compass size={18} strokeWidth={2} /></span>
          <div className="stat-card__body"><strong>{data?.nearby_sellers?.length ?? 0}</strong><span>Мастеров рядом с вами</span></div>
        </div>
      </section>

      <section className="container section section--home-features">
        <div className="section-title section-title--modern"><h2>Почему CraftSphere</h2></div>
        <div className="feature-grid home-feature-grid">
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden><HeartHandshake size={20} strokeWidth={2} /></span>
            <h3>Handmade от мастеров</h3>
            <p>Уникальные изделия с прозрачной историей автора и честной ценой.</p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden><BookOpen size={20} strokeWidth={2} /></span>
            <h3>Мастер-классы онлайн и офлайн</h3>
            <p>Запись в один клик, расписание и напоминания в личном кабинете.</p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden><MapPin size={20} strokeWidth={2} /></span>
            <h3>Мастера рядом</h3>
            <p>Фильтр по городу и студии — находите занятия в вашем районе.</p>
          </article>
        </div>
      </section>

      <section className="container section">
        <div className="section-title"><h2>Новые товары мастеров</h2><p>Свежие добавления в витринах продавцов</p></div>
        <div className="cards-grid home-cards-grid">
          {productCards.map((item) => (
            <CatalogSpotlightCard
              key={item.id}
              kind="product"
              id={item.id}
              title={item.title}
              description={item.description}
              price={item.price}
              images={item.images ?? []}
              tags={item.tags}
              avg_rating={item.avg_rating}
              onPhotoOpen={(images, index) => setViewer({ images, index })}
            />
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-title"><h2>Популярные мастер-классы</h2><p>Подборка обучающих форматов от активных студий</p></div>
        <div className="cards-grid home-cards-grid">
          {serviceCards.map((item) => (
            <CatalogSpotlightCard
              key={item.id}
              kind="service"
              id={item.id}
              title={item.title}
              description={item.description}
              price={item.price}
              images={item.images ?? []}
              tags={item.tags}
              avg_rating={item.avg_rating}
              duration={item.duration}
              onPhotoOpen={(images, index) => setViewer({ images, index })}
            />
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-title"><h2>Истории и блоги мастеров</h2><p>Кейсы роста, вдохновение и практика из реальных студий</p></div>
        <div className="cards-grid home-secondary-grid">{data?.stories?.map((item) => <Link className="story-card card-link" to={`/stories/${item.id}`} key={item.id}><h3>{item.title}</h3><p>{item.content}</p></Link>)}</div>
      </section>

      <section className="container section">
        <div className="section-title"><h2>Мастера рядом с вами</h2></div>
        <div className="cards-grid home-secondary-grid">{data?.nearby_sellers?.map((seller) => <Link className="seller-card card-link" to={`/sellers/${seller.id}`} key={seller.id}><h3>{seller.name}</h3><p>{seller.description}</p><div className="location"><MapPin size={14} /> {seller.location ?? 'Локация не указана'}</div></Link>)}</div>
      </section>

      <footer className="container footer"><p>CraftSphere - современный маркетплейс ручной работы, мастер-классов и творческого сообщества.</p></footer>

      {viewer && <Lightbox images={viewer.images} startIndex={viewer.index} onClose={() => setViewer(null)} />}
    </>
  )
}
