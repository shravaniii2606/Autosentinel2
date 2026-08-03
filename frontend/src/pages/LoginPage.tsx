import { useState } from 'react'
import type { FormEvent } from 'react'
import LoginHeroGlobe from '../pages/LoginHeroGlobe'
import { API_BASE_URL } from '../config'

const LEGACY_USERNAME = 'DOMinators'
const LEGACY_PASSWORD = 'IllegalCatch@26'
const SESSION_KEY = 'autosentinel.authenticated'
const TOKEN_KEY = 'autosentinel.token'
const USER_KEY = 'autosentinel.user'

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    // Legacy fallback check for local quick demo login
    if (!isSignUp && (email === LEGACY_USERNAME || email === 'admin') && password === LEGACY_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      sessionStorage.setItem(USER_KEY, JSON.stringify({ name: 'DOMinators Admin', email: 'admin@autosentinel.org', role: 'admin' }))
      window.location.assign('/dashboard')
      return
    }

    try {
      const endpoint = isSignUp ? `${API_BASE_URL}/auth/register` : `${API_BASE_URL}/auth/login`
      const payload = isSignUp ? { email, password, name } : { email, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Authentication failed.')
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
      // If server registration fails or backend is unreachable, display detailed message
      setError(err.message || 'An unexpected authentication error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      // Trigger Google Auth / Mock Google Auth endpoint
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'mock_google_token_user' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Google sign-in failed.')
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
      setError(err.message || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
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
            {isSignUp ? (
              <>
                Join the
                <br />
                <em>orbit</em> network.
              </>
            ) : (
              <>
                See what
                <br />
                <em>space</em> sees.
              </>
            )}
          </h1>
          <p>
            {isSignUp
              ? 'Create an account to investigate land-change signals and monitor satellite intelligence.'
              : 'Sign in to investigate land-change signals, prioritise risks and begin a live satellite scan.'}
          </p>
        </div>

        <div className="login-form">
          <div className="login-mode-toggle" role="tablist">
            <button
              type="button"
              className={`login-mode-btn ${!isSignUp ? 'active' : ''}`}
              onClick={() => { setIsSignUp(false); setError(''); }}
              role="tab"
              aria-selected={!isSignUp}
            >
              SIGN IN
            </button>
            <button
              type="button"
              className={`login-mode-btn ${isSignUp ? 'active' : ''}`}
              onClick={() => { setIsSignUp(true); setError(''); }}
              role="tab"
              aria-selected={isSignUp}
            >
              CREATE ACCOUNT
            </button>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>{isSignUp ? 'Sign up with Google' : 'Sign in with Google'}</span>
          </button>

          <div className="login-divider">
            <span>OR EMAIL</span>
          </div>

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </>
            )}

            <label htmlFor="email">{isSignUp ? 'Email Address' : 'Email or Username'}</label>
            <input
              id="email"
              type={isSignUp ? 'email' : 'text'}
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isSignUp ? 'name@organization.com' : 'Enter email or DOMinators'}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
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

            <button type="submit" disabled={loading}>
              {loading ? (
                'PROCESSING...'
              ) : isSignUp ? (
                <>
                  CREATE ACCOUNT <span aria-hidden="true">→</span>
                </>
              ) : (
                <>
                  ENTER COMMAND CENTER <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <p className="login-toggle-text">
            {isSignUp ? 'Already have an account?' : 'Need an account?'}
            <button
              type="button"
              className="login-toggle-link"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
            >
              {isSignUp ? 'Sign In' : 'Create New Account'}
            </button>
          </p>
        </div>

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
