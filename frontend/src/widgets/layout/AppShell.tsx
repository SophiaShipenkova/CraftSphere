import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'

import { AccountSidebar } from '../../components/layout/AccountSidebar'
import { Me } from '../../shared/api'

type Props = { me: Me | null }

export function AppShell({ me }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!me) return <Outlet />

  return (
    <div className="app-shell">
      <button
        type="button"
        className="sidebar-toggle mobile-only"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Меню"
      >
        <Menu size={20} />
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Закрыть меню"
        />
      )}
      <div className={`account-sidebar-wrap ${mobileOpen ? 'open' : ''}`}>
        <AccountSidebar me={me} onNavigate={() => setMobileOpen(false)} />
      </div>
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  )
}
