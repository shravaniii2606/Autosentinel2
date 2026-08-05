import { useEffect, useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
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
  const [googleCredential, setGoogleCredential] = useState('')
  const [googleName, setGoogleName] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  const [googlePassword, setGooglePassword] = useState('')
  const [showGoogleSignup, setShowGoogleSignup] = useState(false)

  const clearAuthState = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  }

  useEffect(() => {
    clearAuthState()
    setError('')
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
    setError('Google sign-in was cancelled or failed. Please try again.')
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
          <div className="google-btn" style={{ width: '100%' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              shape="rectangular"
              width="100%"
            />
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
