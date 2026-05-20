import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

import { useBreadcrumbLabels } from './BreadcrumbContext'

const SEGMENT_ROUTES: Record<string, string> = {
  products: '/products',
  services: '/services',
  sellers: '/sellers',
  search: '/search',
  cart: '/cart',
  seller: '/seller'
}

const SEGMENT_LABELS: Record<string, string> = {
  products: 'Товары',
  services: 'Мастер-классы',
  sellers: 'Мастера',
  search: 'Каталог',
  cart: 'Корзина',
  seller: 'Кабинет'
}

type Props = { titles?: Record<string, string> }

export function Breadcrumbs({ titles: titlesProp = {} }: Props) {
  const location = useLocation()
  const contextLabels = useBreadcrumbLabels()
  const titles = { ...titlesProp, ...contextLabels }
  const parts = location.pathname.split('/').filter(Boolean)
  if (parts.length === 0) return null

  return (
    <div className="container breadcrumbs">
      <Link to="/" className="crumb-home"><Home size={14} />Главная</Link>
      {parts.map((part, idx) => {
        const isLast = idx === parts.length - 1
        const isNumeric = /^\d+$/.test(part)
        const route = !isNumeric ? SEGMENT_ROUTES[part] : undefined
        const label = titles[part] || (isNumeric ? titles[`#${part}`] : SEGMENT_LABELS[part]) || part
        const to = route && !isLast ? route : undefined
        return (
          <span key={`${part}-${idx}`} className="crumb-item">
            <ChevronRight size={12} />
            {to ? <Link to={to}>{label}</Link> : <span className="crumb-current">{label}</span>}
          </span>
        )
      })}
    </div>
  )
}
