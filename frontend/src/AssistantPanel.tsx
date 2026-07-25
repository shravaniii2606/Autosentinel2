import { useState, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './config'

export default function AssistantPanel() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const askAssistant = async (text: string) => {
    if (!text.trim()) return
    setLoading(true)
    setAnswer('')
    try {
      const res = await axios.post(`${API_BASE_URL}/assistant/query`, {
        text,
        officer_id: 'field_officer_1',
      })
      setAnswer(res.data.answer)
    } catch (err: any) {
      setAnswer(
        err?.response?.status === 503
          ? 'AI assistant is temporarily unavailable.'
          : 'Error reaching assistant: ' + (err?.message ?? 'unknown error')
      )
    } finally {
      setLoading(false)
    }
  }

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser — try Chrome.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      askAssistant(transcript)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  return (
    <div className="p-5 border-b border-slate-100">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">AI Assistant</p>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askAssistant(query)}
            placeholder="Ask about this zone..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10"
          />
          <button
            onClick={startListening}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
              listening ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-label="Ask by voice"
          >
            🎙
          </button>
        </div>
        <button
          onClick={() => askAssistant(query)}
          disabled={loading || !query.trim()}
          className="mt-2 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:bg-slate-300 disabled:hover:translate-y-0"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
        {answer && (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{answer}</p>
        )}
      </div>
    </div>
  )
}
