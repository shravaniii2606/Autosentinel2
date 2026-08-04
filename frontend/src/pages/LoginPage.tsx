import { useState } from 'react'
import type { FormEvent } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
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

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    setError('')
    setLoading(true)

    try {
      if (!response.credential) {
        throw new Error('Google did not return a credential.')
      }

      const backendResponse = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      })

      const data = await backendResponse.json()

      if (!backendResponse.ok) {
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

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.')
    setLoading(false)
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

          <div className="google-btn" style={{ width: '100%' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text={isSignUp ? 'signup_with' : 'signin_with'}
              shape="rectangular"
              width="100%"
            />
          </div>

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
