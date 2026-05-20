import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../../shared/api'
import { useAuthStore } from '../../store/auth'

const ACCOUNTS = [
  { label: 'Покупатель', email: 'buyer@example.com' },
  { label: 'Продавец', email: 'leaves@example.com' }
]

const DEV_PASSWORD = 'password123'

export function DevRoleSwitcher() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!import.meta.env.DEV) return null

  async function switchTo(email: string) {
    setError('')
    setBusy(email)
    try {
      const { access_token } = await api.login({ email, password: DEV_PASSWORD })
      localStorage.setItem('token', access_token)
      setToken(access_token)
      navigate('/', { replace: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось войти'
      setError(
        msg.includes('401') || msg.toLowerCase().includes('invalid')
          ? 'Demo-аккаунт не найден. Запустите сид БД (buyer@ / leaves@).'
          : msg
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="dev-role-switcher" role="group" aria-label="Переключение demo-роли">
      {ACCOUNTS.map((a) => (
        <button key={a.email} type="button" disabled={!!busy} onClick={() => void switchTo(a.email)}>
          {busy === a.email ? '…' : a.label}
        </button>
      ))}
      {error ? <span className="dev-role-switcher__error">{error}</span> : null}
    </div>
  )
}
