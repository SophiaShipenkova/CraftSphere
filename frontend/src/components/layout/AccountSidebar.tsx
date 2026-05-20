import { NavLink } from 'react-router-dom'
import { LogOut, ShoppingBag, Store, User } from 'lucide-react'

import { gradientFromUser, Me } from '../../shared/api'
import { useAuthStore } from '../../store/auth'

type Props = {
  me: Me
  collapsed?: boolean
  onNavigate?: () => void
}

export function AccountSidebar({ me, collapsed, onNavigate }: Props) {
  const logout = useAuthStore((s) => s.logout)
  const label = me.display_name || me.seller_name || me.email
  const isSeller = me.role === 'seller'

  const links = isSeller
    ? [
        { to: '/seller', label: 'Профиль', end: true },
        { to: '/seller/products', label: 'Товары' },
        { to: '/seller/services', label: 'Мастер-классы' },
        ...(me.seller_profile_id
          ? [{ to: `/sellers/${me.seller_profile_id}`, label: 'Моя витрина' }]
          : [])
      ]
    : [
        { to: '/seller', label: 'Профиль', end: true },
        { to: '/cart', label: 'Корзина' },
        { to: '/seller/events', label: 'Мои записи' }
      ]

  return (
    <aside className={`account-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="account-sidebar__user">
        <span
          className="avatar-circle"
          style={{ background: gradientFromUser(me.id, label) }}
        >
          {label.slice(0, 1).toUpperCase()}
        </span>
        {!collapsed && (
          <div>
            <strong>{label}</strong>
            <div className="muted small">{me.email}</div>
          </div>
        )}
      </div>
      <nav className="account-sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
            onClick={onNavigate}
          >
            {link.label === 'Корзина' ? <ShoppingBag size={16} /> : link.label === 'Моя витрина' ? <Store size={16} /> : <User size={16} />}
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        className="sidebar-link logout"
        onClick={() => {
          logout()
          window.location.href = '/'
        }}
      >
        <LogOut size={16} />
        {!collapsed && <span>Выход</span>}
      </button>
    </aside>
  )
}
