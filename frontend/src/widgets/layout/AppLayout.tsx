import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Moon, Search, ShoppingCart, Sun } from 'lucide-react'

import { AccountSidebar } from '../../components/layout/AccountSidebar'
import { BrandLogo } from '../../components/layout/BrandLogo'
import { BreadcrumbProvider } from '../../components/layout/BreadcrumbContext'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { DevRoleSwitcher } from '../../components/dev/DevRoleSwitcher'
import { api, gradientFromUser, Me, SearchResult } from '../../shared/api'
import { CART_UPDATED_EVENT } from '../../shared/cartEvents'
import { useAuthStore } from '../../store/auth'
import { useTheme } from '../../context/ThemeContext'

function useDebouncedValue(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function useMediaMaxWidth(maxPx: number) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${maxPx}px)`).matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxPx}px)`)
    const fn = () => setMatches(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [maxPx])
  return matches
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const token = useAuthStore((s) => s.token)
  const setToken = useAuthStore((s) => s.setToken)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [mobileMenu, setMobileMenu] = useState(false)
  const debounced = useDebouncedValue(query)
  const compactSearchBar = useMediaMaxWidth(1100)

  const isProfileRoute =
    location.pathname === '/seller' || location.pathname.startsWith('/seller/')

  useEffect(() => {
    if (!isProfileRoute) setMobileMenu(false)
  }, [isProfileRoute])

  function refreshCartCount() {
    if (!token) {
      setCartCount(0)
      return
    }
    api.cart().then((c) => setCartCount(c.count)).catch(() => setCartCount(0))
  }

  useEffect(() => {
    if (!token) {
      setMe(null)
      setCartCount(0)
      return
    }
    api.me().then(setMe).catch((err) => {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('401') || msg.includes('403')) setToken(null)
    })
    refreshCartCount()
  }, [token, setToken, location.pathname])

  useEffect(() => {
    window.addEventListener(CART_UPDATED_EVENT, refreshCartCount)
    return () => window.removeEventListener(CART_UPDATED_EVENT, refreshCartCount)
  }, [token])

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResult(null)
      return
    }
    api.search(debounced).then(setResult).catch(() => setResult(null))
  }, [debounced])

  const quickItems = useMemo(() => {
    if (!result) return []
    return [
      ...result.products.slice(0, 4).map((x) => ({ label: x.title, sub: `${x.price.toLocaleString('ru-RU')} ₽`, to: `/products/${x.id}` })),
      ...result.services.slice(0, 4).map((x) => ({ label: x.title, sub: `${x.price.toLocaleString('ru-RU')} ₽`, to: `/services/${x.id}` })),
      ...result.sellers.slice(0, 4).map((x) => ({ label: x.name, sub: x.location ?? 'Мастер', to: `/sellers/${x.id}` }))
    ]
  }, [result])

  const avatarText = (me?.display_name || me?.seller_name || me?.email || 'U').slice(0, 1).toUpperCase()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
    setOpen(false)
  }

  const showShell = Boolean(me && token && isProfileRoute)

  return (
    <BreadcrumbProvider>
    <div className="page">
      <header className="site-header container">
        <BrandLogo />
        {showShell && (
          <button type="button" className="burger mobile-only" onClick={() => setMobileMenu((v) => !v)} aria-label="Меню">
            ☰
          </button>
        )}

        <div className="live-search-wrap">
          <form onSubmit={onSubmit} className="live-search-form">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder={compactSearchBar ? 'Поиск…' : 'Ищите товары, мастер-классы, мастеров...'}
            />
          </form>
          {open && query.trim().length >= 2 && (
            <div className="search-dropdown" onMouseLeave={() => setOpen(false)}>
              {quickItems.length === 0 && <div className="search-empty">Ничего не найдено</div>}
              {quickItems.map((item) => (
                <Link key={`${item.to}-${item.label}`} to={item.to} className="search-item" onClick={() => setOpen(false)}>
                  <span>{item.label}</span>
                  <small>{item.sub}</small>
                </Link>
              ))}
              <Link className="search-all" to={`/search?q=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)}>
                Смотреть все результаты
              </Link>
            </div>
          )}
        </div>

        <nav className="header-nav">
          <Link to="/cart" className="cart-link" title="Корзина">
            <ShoppingCart size={18} strokeWidth={1.85} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun size={18} strokeWidth={1.85} /> : <Moon size={18} strokeWidth={1.85} />}
          </button>
          {!me ? (
            <>
              <Link to="/login">Вход</Link>
              <Link className="btn btn-sm" to="/register">Регистрация</Link>
            </>
          ) : (
            <Link to="/seller" className="avatar-link" title={me.display_name || me.email}>
              <span className="avatar-circle" style={{ background: gradientFromUser(me.id, me.display_name || me.email) }}>
                {avatarText}
              </span>
            </Link>
          )}
        </nav>
      </header>

      <Breadcrumbs />

      {showShell && me ? (
        <div className={`app-shell ${mobileMenu ? 'menu-open' : ''}`}>
          {mobileMenu && <button type="button" className="sidebar-overlay" onClick={() => setMobileMenu(false)} aria-label="Закрыть" />}
          <AccountSidebar me={me} onNavigate={() => setMobileMenu(false)} />
          <main className="app-shell__main">
            <Outlet />
          </main>
        </div>
      ) : (
        <Outlet />
      )}

      <DevRoleSwitcher />
    </div>
    </BreadcrumbProvider>
  )
}
