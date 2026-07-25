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
        officer_id: 'field_officer_1', // swap for real officer login id when auth exists
      })
      setAnswer(res.data.answer)
      
    } catch (err: any) {
      setAnswer('Error reaching assistant: ' + (err?.message ?? 'unknown error'))
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


}
