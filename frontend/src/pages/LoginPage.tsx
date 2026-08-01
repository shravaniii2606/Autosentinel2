import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

const USERNAME = 'DOMinators'
const PASSWORD = 'IllegalCatch@26'
const SESSION_KEY = 'autosentinel.authenticated'

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export default function LoginPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let frameId = 0
    let lastFrame = 0
    let reversing = false

    const playForward = () => {
      cancelAnimationFrame(frameId)
      reversing = false
      video.currentTime = 0
      void video.play()
    }
    const reverseFrame = (now: number) => {
      const elapsed = lastFrame ? (now - lastFrame) / 1000 : 0
      lastFrame = now
      video.currentTime = Math.max(0, video.currentTime - elapsed)
      if (video.currentTime <= 0.02) {
        playForward()
        return
      }
      frameId = requestAnimationFrame(reverseFrame)
    }
    const playBackward = () => {
      if (reversing) return
      reversing = true
      video.pause()
      if (Number.isFinite(video.duration)) video.currentTime = video.duration
      lastFrame = 0
      frameId = requestAnimationFrame(reverseFrame)
    }
    const monitorEnd = () => {
      if (!reversing && Number.isFinite(video.duration) && video.currentTime >= video.duration - 0.04) playBackward()
    }

    video.addEventListener('ended', playBackward)
    video.addEventListener('timeupdate', monitorEnd)
    return () => {
      cancelAnimationFrame(frameId)
      video.removeEventListener('ended', playBackward)
      video.removeEventListener('timeupdate', monitorEnd)
    }
  }, [])

  return <main className="login-page">
    <section className="login-panel" aria-label="AutoSentinel sign in">
      <a className="login-brand" href="/" aria-label="Return to AutoSentinel home"><img src="/autosentinel-logo.png" alt="" /><span>AUTOSENTINEL</span></a>
      <div className="login-copy"><p className="login-kicker">SECURE OPERATIONS PORTAL</p><h1>See what<br /><em>space</em> sees.</h1><p>Sign in to investigate land-change signals, prioritise risks and begin a live satellite scan.</p></div>
      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label><input id="username" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="Enter your username" required />
        <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required />
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit">ENTER COMMAND CENTER <span aria-hidden="true">→</span></button>
      </form>
      <p className="login-footer">AUTO SENTINEL · INTELLIGENCE FROM ORBIT</p>
    </section>
    <section className="login-video-panel" aria-label="Satellite monitoring footage">
      <video ref={videoRef} className="login-video" src="/login-background.mp4" autoPlay muted playsInline />
      <div className="login-video-overlay" /><div className="login-orbit login-orbit-one" /><div className="login-orbit login-orbit-two" />
      <div className="login-video-caption"><p>LIVE EARTH OBSERVATION</p><span>Detection begins before the ground can react.</span></div>
    </section>
  </main>
}
