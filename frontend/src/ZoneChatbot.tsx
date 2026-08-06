import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { api, isUpgradeRequiredError } from './lib/api'
import type { UpgradeRequiredError } from './lib/api'

interface ZoneChatbotProps {
  zoneId: number | string
  onUpgradeRequired?: (error: UpgradeRequiredError) => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

const quickPrompts = [
  'What is the likely violation here?',
  'Is this zone compliant with land-use rules?',
  'Summarize the risk level for this area.',
]

export default function ZoneChatbot({ zoneId, onUpgradeRequired }: ZoneChatbotProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I can explain the zoning risk, likely violation type, and what the evidence suggests for this area.',
    },
  ])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setQuestion('')
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'I can explain the zoning risk, likely violation type, and what the evidence suggests for this area.',
      },
    ])
    setError('')
  }, [zoneId])

  const canSubmit = useMemo(() => question.trim().length > 0 && !loading, [question, loading])

  const askZoneAssistant = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || loading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedQuestion,
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setQuestion('')
    setError('')

    try {
      const response = await api.post('/assistant/zone-query', {
        zone_id: zoneId,
        text: trimmedQuestion,
      })

      const answer = response.data?.answer || 'No answer returned.'
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
        },
      ])
    } catch (err) {
      if (isUpgradeRequiredError(err)) {
        onUpgradeRequired?.(err)
        return
      }

      const fallbackMessage = axios.isAxiosError(err)
        ? typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Unable to reach the zone assistant.'
        : 'Unable to reach the zone assistant.'

      setError(fallbackMessage)
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: fallbackMessage,
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-500/15 bg-slate-950/75 shadow-[0_18px_45px_-22px_rgba(16,185,129,0.55)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-900 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <span className="text-sm text-emerald-300">✦</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Zone AI</p>
            <p className="text-[11px] text-slate-400">Live compliance assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Online
        </div>
      </div>

      <div className="space-y-2 px-3 pb-3 pt-3">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuestion(prompt)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="max-h-64 space-y-2.5 overflow-y-auto rounded-xl border border-white/5 bg-slate-900/60 p-2.5">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={[
                  'max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm',
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-300 text-slate-950'
                    : message.isError
                      ? 'border border-red-500/30 bg-red-500/10 text-red-100'
                      : 'border border-white/10 bg-slate-800/90 text-slate-100',
                ].join(' ')}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-800/90 px-3 py-2 text-xs text-slate-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={askZoneAssistant} className="flex items-end gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-2">
          <textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                askZoneAssistant(event as unknown as FormEvent)
              }
            }}
            rows={1}
            placeholder="Ask about this zone..."
            className="min-h-[42px] max-h-28 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-300 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-400"
            aria-label="Send message"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  )
}
