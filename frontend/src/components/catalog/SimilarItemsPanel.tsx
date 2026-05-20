import { useEffect, useState } from 'react'

import { api, CatalogItem } from '../../shared/api'
import { CompactCatalogCard } from './CompactCatalogCard'

type Props = {
  kind: 'product' | 'service'
  entityId: number
}

export function SimilarItemsPanel({ kind, entityId }: Props) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const load = kind === 'product' ? api.productSimilar(entityId) : api.serviceSimilar(entityId)
    load
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [kind, entityId])

  if (loading) {
    return (
      <section className="section similar-section">
        <h2>Похожее</h2>
        <p className="muted">Загрузка...</p>
      </section>
    )
  }

  if (!items.length) return null

  return (
    <section className="section similar-section">
      <h2>Похожее</h2>
      <div className="similar-scroll">
        {items.map((item) => (
          <CompactCatalogCard key={`${item.kind}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  )
}
