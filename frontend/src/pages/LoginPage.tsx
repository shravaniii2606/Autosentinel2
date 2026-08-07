import { useEffect, useState } from 'react'
import LoginHeroGlobe from '../pages/LoginHeroGlobe'
import { API_BASE_URL } from '../config'

const SESSION_KEY = 'autosentinel.authenticated'
const TOKEN_KEY = 'autosentinel.token'
const USER_KEY = 'autosentinel.user'

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const clearAuthState = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  }

  useEffect(() => {
    clearAuthState()
    setError('')
  }, [])

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed.')
      }

      sessionStorage.setItem(SESSION_KEY, 'true')
      if (data.access_token) {
        sessionStorage.setItem(TOKEN_KEY, data.access_token)
      }
      if (data.user) {
        sessionStorage.setItem(USER_KEY, JSON.stringify(data.user))
      }

      window.location.assign('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Authentication failed.')
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="AutoSentinel sign in">
        <a className="login-brand" href="/" aria-label="Return to Nirikshan home">
          <img src="/nirikshan-logo.png" alt="Nirikshan logo" />
          <span>NIRIKSHAN</span>
        </a>

        <div className="login-copy">
          <p className="login-kicker">SECURE OPERATIONS PORTAL</p>
          <h1>
            <>
              See what
              <br />
              <em>space</em> sees.
            </>
          </h1>
          <p>
            Enter your email and password to investigate land-change signals, prioritise risks and begin a live satellite scan.
          </p>
        </div>

        <div className="login-form">
          <form onSubmit={handleEmailLogin}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit">ENTER COMMAND CENTER</button>
          </form>
        </div>

        <p className="login-footer">AUTO SENTINEL - INTELLIGENCE FROM ORBIT</p>
      </section>

      <section className="login-video-panel" aria-label="Satellite monitoring visualization">
        <LoginHeroGlobe />
        <div className="login-video-caption">
          <p>LIVE EARTH OBSERVATION</p>
          <span>Detection begins before the ground can react.</span>
        </div>
      </section>
    </main>
  )
}
