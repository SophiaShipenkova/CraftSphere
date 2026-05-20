import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import { CatalogSpotlightCard } from '../components/catalog/CatalogSpotlightCard'
import { api, CatalogResponse } from '../shared/api'

const TYPE_BY_PATH: Record<string, string> = {
  '/products': 'products',
  '/services': 'services',
  '/search': 'all',
  '/sellers': 'all'
}

export function CatalogPage() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<CatalogResponse | null>(null)

  const defaultType = TYPE_BY_PATH[location.pathname] || 'all'
  const type = params.get('type') || defaultType
  const tag = params.get('tag') || ''
  const q = params.get('q') || ''
  const sort = params.get('sort') || 'new'
  const locationFilter = params.get('location') || ''

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    p.set('type', type)
    if (tag) p.set('tag', tag)
    if (q) p.set('q', q)
    if (sort) p.set('sort', sort)
    if (locationFilter) p.set('location', locationFilter)
    return p
  }, [type, tag, q, sort, locationFilter])

  useEffect(() => {
    api.catalog(queryString).then(setData).catch(console.error)
  }, [queryString])

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'type' && !next.get('type')) next.set('type', defaultType)
    setParams(next)
  }

  const title =
    location.pathname === '/products'
      ? 'Товары'
      : location.pathname === '/services'
        ? 'Мастер-классы'
        : 'Каталог'

  return (
    <div className="container section catalog-page">
      <h1>{title}</h1>

      <div className="catalog-filters card">
        <input
          placeholder="Поиск..."
          value={q}
          onChange={(e) => setFilter('q', e.target.value)}
        />
        <input
          placeholder="Город"
          value={locationFilter}
          onChange={(e) => setFilter('location', e.target.value)}
        />
        <select value={type} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="all">Всё</option>
          <option value="products">Товары</option>
          <option value="services">Мастер-классы</option>
        </select>
        <select value={sort} onChange={(e) => setFilter('sort', e.target.value)}>
          <option value="new">Сначала новые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
        </select>
      </div>

      <div className="chip-row">
        <button
          type="button"
          className={!tag ? 'chip active' : 'chip'}
          onClick={() => setFilter('tag', '')}
        >
          Все категории
        </button>
        {data?.categories.map((c) => (
          <button
            key={c.name}
            type="button"
            className={tag === c.name ? 'chip active' : 'chip'}
            onClick={() => setFilter('tag', c.name)}
          >
            #{c.name} ({c.count})
          </button>
        ))}
      </div>

      <p className="muted">Найдено: {data?.total ?? 0}</p>

      <div className="cards-grid home-cards-grid">
        {data?.items.map((item) => (
          <CatalogSpotlightCard
            key={`${item.kind}-${item.id}`}
            kind={item.kind}
            id={item.id}
            title={item.title}
            description={item.description ?? ''}
            price={item.price}
            images={item.image ? [item.image] : []}
            tags={item.tags}
            avg_rating={item.avg_rating}
            duration={item.duration ?? undefined}
            showCart={item.kind === 'product'}
          />
        ))}
      </div>
    </div>
  )
}
