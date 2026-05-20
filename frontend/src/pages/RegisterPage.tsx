import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../shared/api'
import { useAuthStore } from '../store/auth'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'seller' | 'buyer'>('seller')
  const [error, setError] = useState<string | null>(null)
  const setToken = useAuthStore((s) => s.setToken)
  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const data = await api.register({ email, password, role })
      setToken(data.access_token)
      navigate(role === 'seller' ? '/seller' : '/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="container">
      <h1>Регистрация</h1>
      <form className="card" onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Пароль" />
        <select value={role} onChange={(e) => setRole(e.target.value as 'seller' | 'buyer')}>
          <option value="seller">Продавец</option>
          <option value="buyer">Покупатель</option>
        </select>
        <button type="submit">Создать аккаунт</button>
        {error && <div>{error}</div>}
      </form>
    </div>
  )
}
