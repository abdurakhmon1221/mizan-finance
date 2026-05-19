import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError('Email yoki parol noto\'g\'ri')
      return
    }
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-mark">M</div>
          <h1>Mizan Finance</h1>
          <p>O'quv markaz moliyaviy boshqaruvi</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-alert">{error}</div>}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="siz@email.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Parol</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Kirish...' : 'Kirish →'}
          </button>
        </form>

        <p className="login-footer">Mizan Academy · Andijon</p>
      </div>
    </div>
  )
}
