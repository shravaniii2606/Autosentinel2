import { useEffect, useRef, useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import LoginHeroGlobe from '../pages/LoginHeroGlobe'
import { API_BASE_URL, GOOGLE_CLIENT_ID } from '../config'

const SESSION_KEY = 'autosentinel.authenticated'
const TOKEN_KEY = 'autosentinel.token'
const USER_KEY = 'autosentinel.user'

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export default function LoginPage() {
  const isGoogleConfigured = GOOGLE_CLIENT_ID.length > 0
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [googleCredential, setGoogleCredential] = useState('')
  const [googleName, setGoogleName] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  const [googlePassword, setGooglePassword] = useState('')
  const [showGoogleSignup, setShowGoogleSignup] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const [googleButtonWidth, setGoogleButtonWidth] = useState(320)

  const clearAuthState = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  }

  useEffect(() => {
    clearAuthState()
    setError('')
  }, [])

  useEffect(() => {
    const buttonEl = googleButtonRef.current
    if (!buttonEl) return

    const updateButtonWidth = () => {
      const measuredWidth = Math.floor(buttonEl.clientWidth || 320)
      setGoogleButtonWidth(Math.min(400, Math.max(200, measuredWidth)))
    }

    updateButtonWidth()
    const resizeObserver = new ResizeObserver(updateButtonWidth)
    resizeObserver.observe(buttonEl)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const decodeGoogleProfile = (credential: string) => {
    try {
      const payload = credential.split('.')[1]
      if (!payload) return null

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
      const decoded = atob(padded)
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }

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

      setShowGoogleSignup(false)
      window.location.assign('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Authentication failed.')
    }
  }

  const handleGoogleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!googleCredential) {
      setError('Google session expired. Please sign in again.')
      return
    }

    if (!googlePassword.trim()) {
      setError('Please set a password for this account.')
      return
    }

    try {
      const backendResponse = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: googleCredential,
          name: googleName,
          password: googlePassword,
        }),
      })

      const data = await backendResponse.json()

      if (!backendResponse.ok) {
        throw new Error(data.detail || 'Account creation failed.')
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
      setError(err.message || 'Account creation failed.')
    }
  }

  const handleGoogleUnconfiguredClick = () => {
    setError('Google OAuth Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to frontend/.env and GOOGLE_CLIENT_ID to backend/.env.')
  }

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    setError('')

    try {
      if (!response.credential) {
        throw new Error('Google did not return a credential.')
      }

      const profile = decodeGoogleProfile(response.credential)
      if (!profile?.email) {
        throw new Error('Google profile data could not be read.')
      }

      const backendResponse = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: response.credential,
          name: profile.name || profile.given_name || '',
          password: '',
        }),
      })

      const data = await backendResponse.json()

      if (!backendResponse.ok) {
        throw new Error(data.detail || 'Google sign-in failed.')
      }

      if (data.needs_password_setup) {
        setGoogleCredential(response.credential)
        setGoogleName(profile.name || profile.given_name || '')
        setGoogleEmail(profile.email || '')
        setGooglePassword('')
        setShowGoogleSignup(true)
        return
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
    }
  }

  const handleGoogleError = () => {
    setError('Google sign-in failed. Check the OAuth client ID and authorized origin for this domain.')
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
            Continue with Google to investigate land-change signals, prioritise risks and begin a live satellite scan.
          </p>
        </div>

        <div className="login-form">
          <div ref={googleButtonRef} className="google-btn-container" style={{ width: '100%' }}>
            {isGoogleConfigured ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signin_with"
                shape="rectangular"
                width={googleButtonWidth}
              />
            ) : (
              <button
                type="button"
                onClick={handleGoogleUnconfiguredClick}
                className="google-btn"
                style={{ width: '100%' }}
                title="Google OAuth Not Configured"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          <div className="login-divider">
            <span>OR</span>
          </div>

          {showGoogleSignup ? (
            <form onSubmit={handleGoogleSignup}>
              <label htmlFor="google-name">Name</label>
              <input
                id="google-name"
                type="text"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                placeholder="Your name"
                required
              />

              <label htmlFor="google-email">Email</label>
              <input
                id="google-email"
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="Your email"
                required
              />

              <label htmlFor="google-password">Set Password</label>
              <input
                id="google-password"
                type="password"
                value={googlePassword}
                onChange={(e) => setGooglePassword(e.target.value)}
                placeholder="Set your password"
                required
              />

              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit">CREATE ACCOUNT</button>
            </form>
          ) : (
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
          )}
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
