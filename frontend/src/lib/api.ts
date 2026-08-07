import axios from 'axios'
import { API_BASE_URL } from '../config'

const TOKEN_KEY = 'autosentinel.token'

type UpgradeErrorCode = 'free_limit_reached' | 'subscription_required'

export interface UpgradeErrorBody {
  error: UpgradeErrorCode
  message?: string
  feature?: string
  scans_used?: number
  scan_limit?: number
  scans_remaining?: number
}

export interface SubscriptionSummary {
  status: 'free' | 'active' | 'cancelled'
  plan: string | null
  scans_used: number
  scans_remaining: number | null
  is_subscribed: boolean
}

export class UpgradeRequiredError extends Error {
  status: number
  body: UpgradeErrorBody
  code: UpgradeErrorCode
  feature?: string

  constructor(status: number, body: UpgradeErrorBody) {
    super(body.message || defaultUpgradeMessage(body))
    this.name = 'UpgradeRequiredError'
    this.status = status
    this.body = body
    this.code = body.error
    this.feature = body.feature
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use(config => {
  const token = getAuthToken()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => Promise.reject(toUpgradeError(error) ?? error),
)

export function isUpgradeRequiredError(error: unknown): error is UpgradeRequiredError {
  return error instanceof UpgradeRequiredError
}

export async function getSubscription() {
  const response = await api.get<SubscriptionSummary>('/me/subscription')
  return response.data
}

export async function activateSubscription(plan: string) {
  const response = await api.post<SubscriptionSummary>('/subscription/activate', { plan })
  return response.data
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getAuthToken()
  const headers = new Headers(init.headers)
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(resolveApiUrl(path), { ...init, headers })

  if (!response.ok && (response.status === 402 || response.status === 403)) {
    const body = normalizeUpgradeBody(await response.clone().json().catch(() => null))
    if (body) {
      throw new UpgradeRequiredError(response.status, body)
    }
  }

  return response
}

function getAuthToken() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(TOKEN_KEY)
}

function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function toUpgradeError(error: unknown) {
  if (error instanceof UpgradeRequiredError) return error
  if (!axios.isAxiosError(error)) return null

  const status = error.response?.status
  if (status !== 402 && status !== 403) return null

  const body = normalizeUpgradeBody(error.response?.data)
  return body ? new UpgradeRequiredError(status, body) : null
}

function normalizeUpgradeBody(value: unknown): UpgradeErrorBody | null {
  if (!isRecord(value)) return null

  const body = isRecord(value.detail) ? value.detail : value
  if (!isRecord(body) || !isUpgradeErrorCode(body.error)) return null

  return {
    error: body.error,
    message: typeof body.message === 'string' ? body.message : undefined,
    feature: typeof body.feature === 'string' ? body.feature : undefined,
    scans_used: typeof body.scans_used === 'number' ? body.scans_used : undefined,
    scan_limit: typeof body.scan_limit === 'number' ? body.scan_limit : undefined,
    scans_remaining: typeof body.scans_remaining === 'number' ? body.scans_remaining : undefined,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUpgradeErrorCode(value: unknown): value is UpgradeErrorCode {
  return value === 'free_limit_reached' || value === 'subscription_required'
}

function defaultUpgradeMessage(body: UpgradeErrorBody) {
  if (body.error === 'free_limit_reached') {
    return 'Free scan limit reached. Upgrade to continue scanning.'
  }
  return 'Upgrade to a paid plan to use this feature.'
}
