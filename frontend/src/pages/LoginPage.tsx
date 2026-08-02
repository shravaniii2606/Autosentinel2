import { useState } from 'react'
import type { FormEvent } from 'react'
import LoginHeroGlobe from '../pages/LoginHeroGlobe'

const USERNAME = 'DOMinators'
const PASSWORD = 'IllegalCatch@26'
const SESSION_KEY = 'autosentinel.authenticated'

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (username === USERNAME && password === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      window.location.assign('/dashboard')
      return
    }
    setError('The username or password is not recognised.')
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="AutoSentinel sign in">
        <a className="login-brand" href="/" aria-label="Return to AutoSentinel home">
          <img src="/autosentinel-logo.png" alt="" />
          <span>AUTOSENTINEL</span>
        </a>
        <div className="login-copy">
          <p className="login-kicker">SECURE OPERATIONS PORTAL</p>
          <h1>
            See what
            <br />
            <em>space</em> sees.
          </h1>
          <p>Sign in to investigate land-change signals, prioritise risks and begin a live satellite scan.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit">
            ENTER COMMAND CENTER <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="login-footer">AUTO SENTINEL · INTELLIGENCE FROM ORBIT</p>
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
