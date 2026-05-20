import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../shared/api'
import { useAuthStore } from '../store/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const setToken = useAuthStore((s) => s.setToken)
  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const data = await api.login({ email, password })
      setToken(data.access_token)
      navigate('/seller')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="container">
      <h1>Вход</h1>
      <form className="card" onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Пароль" />
        <button type="submit">Войти</button>
        {error && <div>{error}</div>}
      </form>
      <Link to="/register">Нет аккаунта?</Link>
    </div>
  )
}
