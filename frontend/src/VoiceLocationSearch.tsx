import { useState } from 'react'

interface VoiceLocationSearchProps {
  onLocationFound: (lat: number, lon: number, placeName: string) => void
}

export default function VoiceLocationSearch({ onLocationFound }: VoiceLocationSearchProps) {
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const geocodePlace = async (placeName: string) => {
    const trimmed = placeName.trim()
    if (!trimmed) {
      setError('Please speak a location name first.')
      return
    }

    setError('')
    setStatus(`Looking up “${trimmed}”...`)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmed)}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Geocoding request failed.')
      }

      const results = await response.json()
      const firstResult = Array.isArray(results) ? results[0] : null

      if (!firstResult) {
        setError(`No match found for “${trimmed}”. Try a clearer place name.`)
        setStatus('')
        return
      }

      const lat = Number(firstResult.lat)
      const lon = Number(firstResult.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error('Coordinates were not returned.')
      }

      const placeLabel = firstResult.display_name || trimmed
      setStatus('')
      onLocationFound(lat, lon, placeLabel)
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : 'Unable to geocode the spoken location.'
      setError(`Unable to find the spoken place: ${message}`)
      setStatus('')
    }
  }

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      setStatus('')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    setListening(true)
    setError('')
    setStatus('Listening for a place name...')

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()

      if (transcript) {
        recognition.stop()
        geocodePlace(transcript)
      }
    }

    recognition.onerror = (event: any) => {
      const friendlyMessage = event.error === 'not-allowed'
        ? 'Microphone access was blocked. Please allow microphone access and try again.'
        : event.error === 'no-speech'
          ? 'No speech was detected. Please try again.'
          : 'Speech recognition failed. Please try again.'

      setError(friendlyMessage)
      setStatus('')
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognition.start()
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={startListening}
        aria-label="Search by voice"
        className={[
          'flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition-all duration-200 ease-out',
          listening
            ? 'border-amber-400/60 bg-amber-400 text-black shadow-[0_0_0_3px_rgba(251,191,36,0.2)]' 
            : 'border-white/10 bg-neutral-900 text-amber-300 hover:border-amber-400/40 hover:bg-neutral-800',
          listening ? 'animate-pulse' : '',
        ].join(' ')}
      >
        {listening ? '🎙' : '🎤'}
      </button>

      {status && (
        <div className="text-[10px] text-neutral-300">{status}</div>
      )}

      {error && (
        <div className="max-w-[220px] text-[10px] text-rose-300">{error}</div>
      )}
    </div>
  )
}
