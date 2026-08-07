// @ts-nocheck
import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, WMSTileLayer, CircleMarker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import AssistantPanel from './AssistantPanel'
import ZoneChatbot from './ZoneChatbot'
import VoiceLocationSearch from './VoiceLocationSearch'
import { API_BASE_URL } from './config'
import { activateSubscription, api, apiFetch, getSubscription, isUpgradeRequiredError } from './lib/api'
import type { SubscriptionSummary, UpgradeRequiredError } from './lib/api'
import LandingPage from './pages/LandingPage'
import LoginPage, { isAuthenticated } from './pages/LoginPage'
import { formatViolationType } from './utils/violationLabel'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'



interface Zone {
  id: number | string
  location_name?: string
  bbox?: { minx: number, miny: number, maxx: number, maxy: number }
  lat: number
  lon: number
  area_sqm: number
  severity: string
  risk_score: number
  action: string
  violation_type: string
  bhuvan_land_type?: string
  bhuvan_confidence?: string
  bhuvan_overlap_percent?: number
  bhuvan_source?: string
  osm_flags?: string[]
  legal_flags?: string[]
  risk_boost_total?: number
  microsoft_confirmed: boolean
  construction_detected?: boolean
  objects_found?: string[]
  vision_confidence?: number
  ml_confidence?: number
  crane_present?: boolean
  building_present?: boolean
  container_present?: boolean
  yolo_boxes?: YoloBox[]
  area_label?: string
  period_label?: string
}

interface YoloBox {
  label: string
  confidence: number
  x1: number
  y1: number
  x2: number
  y2: number
}

interface PlaceResult {
  place_id: string | number
  display_name: string
  lat: string
  lon: string
}

interface Summary {
  total: number
  severity_breakdown: {
    CRITICAL: number
    HIGH: number
    MEDIUM: number
    LOW: number
  }
  microsoft_confirmed: number
  area: string
  period: string
}

const severityColor: Record<string, string> = {
  CRITICAL: '#ff0000',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e'
}

const severityRadius: Record<string, number> = {
  CRITICAL: 14,
  HIGH: 10,
  MEDIUM: 7,
  LOW: 4
}

const violationColor: Record<string, string> = {
  FOREST_ENCROACHMENT: '#15803d',
  WATER_BODY_ENCROACHMENT: '#0284c7',
  AGRICULTURAL_LAND: '#ca8a04',
  PROTECTED_LAND: '#7c3aed',
  POSSIBLE_PERMIT_VIOLATION: '#db2777',
  UNVERIFIED_ZONE: '#6b7280'
}

const visionObjectLabels: Record<string, string> = {
  building: 'Building',
  crane: 'Crane',
  container: 'Container'
}

const visionObjectMarkerLabels: Record<string, string> = {
  building: 'BLD',
  crane: 'CRN',
  container: 'CNT'
}

const visionObjectColors: Record<string, string> = {
  building: '#f97316',
  crane: '#ef4444',
  container: '#eab308'
}

const drawnAreaStorageKey = 'autosentinel.drawnArea'

function mergeZones(current: Zone[], incoming: Zone[]) {
  const byId = new Map<string, Zone>()
  current.forEach(zone => byId.set(String(zone.id), zone))
  incoming.forEach(zone => byId.set(String(zone.id), zone))
  return Array.from(byId.values())
}

function getScanSummaryFromZones(zones: Zone[], fallback: Summary | null): Summary {
  const latest = zones[zones.length - 1]
  return {
    total: zones.length,
    severity_breakdown: {
      CRITICAL: zones.filter(z => z.severity === 'CRITICAL').length,
      HIGH: zones.filter(z => z.severity === 'HIGH').length,
      MEDIUM: zones.filter(z => z.severity === 'MEDIUM').length,
      LOW: zones.filter(z => z.severity === 'LOW').length,
    },
    microsoft_confirmed: zones.filter(z => z.microsoft_confirmed).length,
    area: latest?.area_label || fallback?.area || 'Selected area',
    period: latest?.period_label || fallback?.period || '2019 vs 2026',
  }
}

function getDetectedObjects(zone: Zone | null) {
  if (!zone) return []

  const objects = new Set<string>(
    Array.isArray(zone.objects_found)
      ? zone.objects_found.map(obj => String(obj).toLowerCase())
      : []
  )

  if (zone.building_present) objects.add('building')
  if (zone.crane_present) objects.add('crane')
  if (zone.container_present) objects.add('container')

  return ['building', 'crane', 'container'].filter(obj => objects.has(obj))
}

function getVisionBoxes(zone: Zone | null) {
  return Array.isArray(zone?.yolo_boxes) ? zone!.yolo_boxes : []
}

function formatVisionConfidence(value?: number) {
  const confidence = Number(value || 0)
  const percent = confidence > 1 ? confidence : confidence * 100
  return `${Math.round(percent)}%`
}

function getZoneVisionConfidence(zone: Zone | null) {
  if (!zone) return null

  const boxConfidence = getVisionBoxes(zone)
    .map(box => Number(box.confidence))
    .filter(Number.isFinite)
    .reduce((highest, confidence) => Math.max(highest, confidence), 0)

  if (boxConfidence > 0) return boxConfidence

  const visionConfidence = Number(zone.vision_confidence)
  if (Number.isFinite(visionConfidence) && visionConfidence > 0) return visionConfidence

  const mlConfidence = Number(zone.ml_confidence)
  if (Number.isFinite(mlConfidence) && mlConfidence > 0) return mlConfidence

  return null
}

function formatZoneVisionConfidence(zone: Zone | null) {
  const confidence = getZoneVisionConfidence(zone)
  return confidence == null ? 'N/A' : formatVisionConfidence(confidence)
}

function getVisionStatuses(zone: Zone | null) {
  if (!zone) return []

  const statuses = []
  if (zone.crane_present) statuses.push('Active Construction')
  if (zone.building_present) statuses.push('Structure Found')
  if (zone.container_present) statuses.push('Material Storage Detected')

  return statuses
}

function getRiskBadges(zone: Zone | null) {
  if (!zone) return []

  const badges = []
  if (zone.crane_present) badges.push({ label: 'LIVE CONSTRUCTION', className: 'bg-red-600 text-white' })
  if (zone.building_present) badges.push({ label: 'STRUCTURE DETECTED', className: 'bg-amber-400/15 text-amber-300' })
  if (zone.container_present) badges.push({ label: 'MATERIALS FOUND', className: 'bg-neutral-800 text-neutral-200' })

  return badges
}

function normalizeYoloLabel(label: string) {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('crane')) return 'crane'
  if (normalized.includes('container')) return 'container'
  if (normalized.includes('building') || normalized.includes('structure')) return 'building'
  return normalized
}


function ImageSlider({ beforeUrl, afterUrl, boxes = [] }: { beforeUrl: string, afterUrl: string, boxes?: YoloBox[] }) {
  const [sliderPos, setSliderPos] = useState(50)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setContainerSize({ width: rect.width, height: rect.height })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const updateSlider = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    setSliderPos(Math.max(0, Math.min(100, x)))
  }

  const handleMouseMove = (e: React.MouseEvent) => updateSlider(e.clientX)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) updateSlider(e.touches[0].clientX)
  }

  const getBoxStyle = (box: YoloBox) => {
    if (!containerSize.width || !containerSize.height || !imageSize.width || !imageSize.height) {
      return null
    }

    const raw = [box.x1, box.y1, box.x2, box.y2].map(Number)
    if (raw.some(value => !Number.isFinite(value))) return null

    const [x1Raw, y1Raw, x2Raw, y2Raw] = raw
    const normalized = Math.max(x1Raw, y1Raw, x2Raw, y2Raw) <= 1
    const sourceX1 = normalized ? x1Raw * imageSize.width : x1Raw
    const sourceY1 = normalized ? y1Raw * imageSize.height : y1Raw
    const sourceX2 = normalized ? x2Raw * imageSize.width : x2Raw
    const sourceY2 = normalized ? y2Raw * imageSize.height : y2Raw

    const scale = Math.max(containerSize.width / imageSize.width, containerSize.height / imageSize.height)
    const renderedWidth = imageSize.width * scale
    const renderedHeight = imageSize.height * scale
    const offsetX = (containerSize.width - renderedWidth) / 2
    const offsetY = (containerSize.height - renderedHeight) / 2

    const left = offsetX + Math.min(sourceX1, sourceX2) * scale
    const top = offsetY + Math.min(sourceY1, sourceY2) * scale
    const width = Math.abs(sourceX2 - sourceX1) * scale
    const height = Math.abs(sourceY2 - sourceY1) * scale

    if (width <= 0 || height <= 0) return null

    return { left, top, width, height }
  }

  const fullImageWidth = containerSize.width ? `${containerSize.width}px` : '100%'

  return (
    <div
      ref={containerRef}
      className="relative h-48 w-full cursor-col-resize select-none overflow-hidden rounded-xl border border-white/10"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onClick={(e) => updateSlider(e.clientX)}
    >
      {/* After image (bottom) */}
      <img
        src={afterUrl}
        alt="After 2026"
        className="absolute inset-0 w-full h-full object-cover"
        onLoad={(e) => setImageSize({
          width: e.currentTarget.naturalWidth,
          height: e.currentTarget.naturalHeight
        })}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        {boxes.map((box, index) => {
          const boxStyle = getBoxStyle(box)
          if (!boxStyle) return null

          const label = normalizeYoloLabel(box.label)
          const color = visionObjectColors[label] || '#38bdf8'

          return (
            <div
              key={`${box.label}-${index}`}
              className="absolute border-2 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.75)]"
              style={{
                left: `${boxStyle.left}px`,
                top: `${boxStyle.top}px`,
                width: `${boxStyle.width}px`,
                height: `${boxStyle.height}px`,
                borderColor: color
              }}
            >
              <span
                className="absolute left-0 top-0 max-w-full truncate px-1 py-0.5 text-[10px] font-bold uppercase leading-none text-slate-900"
                style={{ backgroundColor: color }}
              >
                {visionObjectLabels[label] || box.label} {formatVisionConfidence(box.confidence)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Before image (top, clipped) */}
      <div
        className="absolute inset-0 overflow-hidden z-[2]"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeUrl}
          alt="Before 2019"
          className="absolute inset-0 h-full object-cover"
          style={{ width: fullImageWidth, maxWidth: 'none' }}
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 z-10 w-0.5 bg-amber-300"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-sky-50 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-slate-900 text-xs font-bold">◀▶</span>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-xs px-2 py-0.5 rounded z-10">
        2019
      </div>
      <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-xs px-2 py-0.5 rounded z-10">
        2026
      </div>
    </div>
  )
}
function ZoneImages({ zoneId, lat, lon, boxes = [] }: { zoneId: number | string, lat: number, lon: number, boxes?: YoloBox[] }) {
  const [images, setImages] = useState<{
    has_images: boolean
    before_url: string | null
    after_url: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setImages(null)

    axios.get(`${API_BASE_URL}/zones/${zoneId}/images`)
      .then(res => {
        if (res.data?.has_images) {
          setImages(res.data)
          setLoading(false)
          return null
        }
        return axios.get(`${API_BASE_URL}/zones/${zoneId}/live-images`, {
          params: { lat, lon }
        })
      })
      .then(res => {
        if (res) setImages(res.data)
      })
      .catch(() => {
        setImages(null)
      })
      .finally(() => setLoading(false))
  }, [zoneId, lat, lon])

  if (loading) {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-neutral-900 p-3 text-center text-xs text-neutral-400 animate-pulse">
        Fetching satellite imagery...
      </div>
    )
  }

  if (!images || !images.has_images) {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-neutral-900 p-2 text-center text-xs text-neutral-400">
        Satellite imagery unavailable for this zone
      </div>
    )
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-slate-500 mb-2">SATELLITE EVIDENCE — drag to compare</p>
      <ImageSlider
        beforeUrl={images.before_url!}
        afterUrl={images.after_url!}
        boxes={boxes}
      />
    </div>
  )
}
function LiveScanPanel({ onZonesReceived }: { onZonesReceived: (zones: Zone[]) => void }) {
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<{
  active: boolean
  progress: string
  jobId: string | null
} >({ active: false, progress: '', jobId: null })
  const [progress, setProgress] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [drawnBounds, setDrawnBounds] = useState<any>(null)
  const pollRef = useRef<any>(null)
  useEffect(() => {
    const handler = (e: any) => {
      setDrawnBounds(e.detail)
    }
    window.addEventListener('bbox-drawn', handler)
    return () => window.removeEventListener('bbox-drawn', handler)
  }, [])

  const startScan = async () => {
    if (!drawnBounds) {
      alert('Draw an area on the map first using the Pen tool')
      return
    }
    setScanning(true)
    setProgress('Starting scan...')

    try {
      const res = await api.post('/process_bbox', drawnBounds)
      const id = res.data.job_id
      setJobId(id)

      // Poll every 5 seconds
      pollRef.current = setInterval(async () => {
        const status = await axios.get(`${API_BASE_URL}/jobs/${id}`)
        setProgress(status.data.progress)

        if (status.data.status === 'done' && status.data.result) {
          clearInterval(pollRef.current)
          setScanning(false)
          onZonesReceived(status.data.result)
          setProgress(`Done — ${status.data.result.length} zones found`)
        } else if (status.data.status === 'error') {
          clearInterval(pollRef.current)
          setScanning(false)
          setProgress(`Failed: ${status.data.error}`)
        }
      }, 5000)
    } catch (err) {
      setScanning(false)
      setProgress(isUpgradeRequiredError(err) ? `Upgrade required: ${err.message}` : 'Request failed')
    }
  }

  return (
    <div className="p-4 border-b border-slate-200 bg-sky-50 rounded-lg">
      <p className="text-xs text-slate-500 mb-2 font-medium tracking-wider">LIVE SCAN</p>
      <p className="text-xs text-slate-500 mb-3">
        {drawnBounds
          ? `Area selected: ${drawnBounds.north.toFixed(3)}°N, ${drawnBounds.west.toFixed(3)}°W`
          : 'Draw an area on the map using the Pen tool'}
      </p>
      <button
        onClick={startScan}
        disabled={scanning || !drawnBounds}
        className="w-full py-2 rounded text-xs font-bold transition-colors disabled:opacity-50 text-white"
        style={{ backgroundColor: scanning ? '#2563eb' : '#0284c7' }}
      >
        {scanning ? 'Scanning...' : 'Scan Selected Area'}
      </button>
      {progress && (
        <div className="mt-2 p-2 bg-sky-50 rounded">
          <p className="text-xs text-blue-600">{progress}</p>
          {scanning && (
            <div className="mt-1 h-1 bg-sky-100 rounded overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface UpgradeNotice {
  title: string
  featureLabel: string
  message: string
  detail: string
}

function UpgradePromptModal({
  notice,
  onClose,
  onViewPlans,
}: {
  notice: UpgradeNotice | null
  onClose: () => void
  onViewPlans: () => void
}) {
  if (!notice) return null

  return (
    <div className="fixed inset-0 z-[1400] grid place-items-center bg-slate-950/75 px-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-300/25 bg-[#07100f] text-white shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/10 bg-amber-300/10 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Upgrade required</p>
          <h2 className="mt-1 text-xl font-bold">{notice.title}</h2>
        </div>
        <div className="px-5 py-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Locked feature</p>
                <p className="mt-1 text-base font-semibold text-white">{notice.featureLabel}</p>
              </div>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                Paid
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{notice.message}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{notice.detail}</p>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onViewPlans}
              className="flex-1 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/70"
            >
              View plans
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-slate-300/40"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
function Dashboard() {
  const [drawMode, setDrawMode] = useState<'none'|'circle'|'pen'>('none')
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null)
  const [circleRadius, setCircleRadius] = useState<number | null>(null) // meters
  const [drawnGeoJSON, setDrawnGeoJSON] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem(drawnAreaStorageKey)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [circleDrawn, setCircleDrawn] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [violationFilter, setViolationFilter] = useState<string>('ALL')
  const [visionFilter, setVisionFilter] = useState<string>('ALL')
  const [scanStatus, setScanStatus] = useState<{
    active: boolean
    progress: string
    jobId: string | null
  }>({ active: false, progress: '', jobId: null })
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [placeQuery, setPlaceQuery] = useState<string>('')
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([])
  const [placeLoading, setPlaceLoading] = useState<boolean>(false)
  const [placeError, setPlaceError] = useState<string>('')
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [coordinateLat, setCoordinateLat] = useState<string>('')
  const [coordinateLng, setCoordinateLng] = useState<string>('')
  const [reportStatus, setReportStatus] = useState<string>('')
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [upgradeNotice, setUpgradeNotice] = useState<UpgradeNotice | null>(null)
  const [activatingPlan, setActivatingPlan] = useState<string>('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('')
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false)
  const [drawerSection, setDrawerSection] = useState<'dashboard'|'subscriptions'|'profile'|'downloads'>('dashboard')
  const [language, setLanguage] = useState<'English'|'Hindi'|'Spanish'|'French'>('English')
  const [theme, setTheme] = useState<'dark'|'light'>('dark')
  const [profile, setProfile] = useState({
    name: 'Nirikshan User',
    email: '',
    password: '',
    occupation: '',
    plan: 'Free'
  })
  const [downloadHistory, setDownloadHistory] = useState<{ id: string; fileName: string; date: string }[]>([])

  const refreshSubscription = async () => {
    try {
      const nextSubscription = await getSubscription()
      setSubscription(nextSubscription)
      setProfile(current => ({
        ...current,
        plan: nextSubscription.is_subscribed ? nextSubscription.plan || 'Paid' : 'Free',
      }))
    } catch {
      setSubscription(null)
    }
  }

  const handleActivatePlan = async (plan: string) => {
    setActivatingPlan(plan)
    setSubscriptionStatus('')
    try {
      const token = sessionStorage.getItem('autosentinel.token')
      let nextSubscription: SubscriptionSummary

      if (!token) {
        nextSubscription = {
          status: 'active',
          plan,
          scans_used: 0,
          scans_remaining: null,
          is_subscribed: true,
        }
      } else {
        nextSubscription = await activateSubscription(plan)
      }

      setSubscription(nextSubscription)
      setProfile(current => ({ ...current, plan: nextSubscription.plan || plan }))
      setSubscriptionStatus(`${nextSubscription.plan || plan} is active on this account.`)
    } catch (error) {
      setSubscriptionStatus(error instanceof Error ? error.message : 'Unable to activate this plan.')
    } finally {
      setActivatingPlan('')
    }
  }

  const showUpgradePrompt = (error: UpgradeRequiredError, fallbackFeature: string) => {
    const feature = error.feature || fallbackFeature
    const featureLabel = feature === 'report_generation'
      ? 'PDF report generation'
      : feature === 'ai_chatbot'
      ? 'AI compliance assistant'
      : 'Satellite scans'

    setUpgradeNotice({
      title: error.code === 'free_limit_reached' ? 'Free scan limit reached' : 'This feature is paid',
      featureLabel,
      message: error.message,
      detail: error.code === 'free_limit_reached'
        ? 'Free accounts include 3 lifetime scans. Upgrade to continue scanning without limits.'
        : 'Upgrade to unlock AI assistance, official PDF reports, and unlimited scan capacity.',
    })
  }

  const openSubscriptionMenu = () => {
    setUpgradeNotice(null)
    setDrawerSection('subscriptions')
    setSidebarMenuOpen(false)
  }

  const signOut = () => {
    sessionStorage.removeItem('autosentinel.authenticated')
    sessionStorage.removeItem('autosentinel.token')
    sessionStorage.removeItem('autosentinel.user')
    window.location.assign('/login')
  }

  const openDrawerSection = (section: typeof drawerSection) => {
    setDrawerSection(section)
    setSidebarMenuOpen(false)
  }

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('autosentinel.profile')
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile))
      }

      const savedUser = sessionStorage.getItem('autosentinel.user')
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          setProfile(current => ({
            ...current,
            name: user.name || current.name,
            email: user.email || current.email,
            plan: current.plan || 'Free',
          }))
        } catch {
          // ignore invalid saved user data
        }
      }

      const savedDownloads = localStorage.getItem('autosentinel.downloadedReports')
      if (savedDownloads) {
        setDownloadHistory(JSON.parse(savedDownloads))
      }
      const savedSubscription = localStorage.getItem('autosentinel.subscription')
      if (savedSubscription) {
        try {
          const parsed = JSON.parse(savedSubscription) as SubscriptionSummary
          setSubscription(parsed)
          setProfile(current => ({
            ...current,
            plan: parsed.is_subscribed ? parsed.plan || 'Paid' : 'Free',
          }))
        } catch {
          // ignore invalid subscription data
        }
      }
      const savedLanguage = localStorage.getItem('autosentinel.language')
      if (savedLanguage) {
        setLanguage(savedLanguage as 'English'|'Hindi'|'Spanish'|'French')
      }
      const savedTheme = localStorage.getItem('autosentinel.theme')
      if (savedTheme) {
        setTheme(savedTheme as 'dark'|'light')
      }
    } catch {
      // ignore invalid storage data
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('autosentinel.profile', JSON.stringify(profile))
    } catch {}
  }, [profile])

  useEffect(() => {
    try {
      if (subscription) {
        localStorage.setItem('autosentinel.subscription', JSON.stringify(subscription))
      } else {
        localStorage.removeItem('autosentinel.subscription')
      }
    } catch {}
  }, [subscription])

  useEffect(() => {
    try {
      localStorage.setItem('autosentinel.downloadedReports', JSON.stringify(downloadHistory))
    } catch {}
  }, [downloadHistory])

  useEffect(() => {
    try {
      localStorage.setItem('autosentinel.language', language)
      localStorage.setItem('autosentinel.theme', theme)
      document.documentElement.dataset.theme = theme
    } catch {}
  }, [language, theme])

  const saveProfileField = (field: keyof typeof profile, value: string) => {
    setProfile(current => ({ ...current, [field]: value }))
  }

  const liveSummary = {
    total: zones.length,
    severity_breakdown: {
      CRITICAL: zones.filter(z => z.severity === 'CRITICAL').length,
      HIGH: zones.filter(z => z.severity === 'HIGH').length,
      MEDIUM: zones.filter(z => z.severity === 'MEDIUM').length,
      LOW: zones.filter(z => z.severity === 'LOW').length,
    }
  }

  useEffect(() => {
    axios.get(`${API_BASE_URL}/zones`).then(res => setZones(res.data.zones))
    axios.get(`${API_BASE_URL}/zones/summary`).then(res => setSummary(res.data))
    void refreshSubscription()
  }, [])

  useEffect(() => {
    try {
      if (drawnGeoJSON) {
        localStorage.setItem(drawnAreaStorageKey, JSON.stringify(drawnGeoJSON))
      } else {
        localStorage.removeItem(drawnAreaStorageKey)
      }
    } catch {}
  }, [drawnGeoJSON])

  const filtered = zones.filter(z => {
    const sev = severityFilter === 'ALL' || z.severity === severityFilter
    const vio = violationFilter === 'ALL' || z.violation_type === violationFilter
    const vision = visionFilter === 'ALL' ||
      (visionFilter === 'verified' && Boolean(z.construction_detected)) ||
      (visionFilter === 'crane' && Boolean(z.crane_present)) ||
      (visionFilter === 'building' && Boolean(z.building_present)) ||
      (visionFilter === 'container' && Boolean(z.container_present))
    // If a circle is drawn, also filter by distance
    if (circleCenter && circleRadius != null) {
      const toRad = (deg: number) => deg * Math.PI / 180
      const R = 6371000 // meters
      const dLat = toRad(z.lat - circleCenter[0])
      const dLon = toRad(z.lon - circleCenter[1])
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(circleCenter[0])) * Math.cos(toRad(z.lat)) * Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      const dist = R * c
      return sev && vio && vision && dist <= circleRadius
    }
    return sev && vio && vision
  })

  const selectedObjects = getDetectedObjects(selectedZone)
  const selectedStatuses = getVisionStatuses(selectedZone)
  const selectedRiskBadges = getRiskBadges(selectedZone)
  const selectedBoxes = getVisionBoxes(selectedZone)

  const downloadReport = async () => {
    if (!selectedZone) return

    setReportStatus('Preparing PDF...')
    try {
      const response = await apiFetch(`/zones/${encodeURIComponent(String(selectedZone.id))}/report`)
      if (!response.ok) {
        let message = 'Unable to generate the report.'
        try {
          const body = await response.json()
          message = body.detail || body.error || message
        } catch {}
        throw new Error(message)
      }

      const blob = await response.blob()
      if (blob.size === 0) throw new Error('The generated report was empty.')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `autosentinel_report_zone_${selectedZone.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setReportStatus('Report downloaded.')
      try {
        const newDownload = {
          id: `${selectedZone.id}-${Date.now()}`,
          fileName: `autosentinel_report_zone_${selectedZone.id}.pdf`,
          date: new Date().toISOString()
        }
        setDownloadHistory(prev => [newDownload, ...prev].slice(0, 20))
      } catch {}
    } catch (error) {
      if (isUpgradeRequiredError(error)) {
        setReportStatus('')
        showUpgradePrompt(error, 'report_generation')
        return
      }

      setReportStatus(error instanceof Error ? error.message : 'Unable to download the report.')
    }
  }

  const flyToCoordinates = (lat: number, lng: number, label?: string) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert('Invalid location coordinates.')
      return
    }
    if (!mapInstance) return

    mapInstance.flyTo([lat, lng], 14, { duration: 1 })
    setSelectedZone(null)
    setCircleCenter(null)
    setCircleRadius(null)

    if (label) {
      setSelectedPlace(prev => ({
        place_id: typeof prev?.place_id !== 'undefined' ? prev.place_id : `${lat}:${lng}`,
        display_name: label,
        lat: String(lat),
        lon: String(lng)
      }))
    }
  }

  const flyToLatLng = (lat: number, lng: number, label?: string) => flyToCoordinates(lat, lng, label)

  const triggerBboxScan = async (bbox: Record<string, number>, placeName?: string) => {
    const bboxDetail = {
      minx: Number(bbox.minx),
      miny: Number(bbox.miny),
      maxx: Number(bbox.maxx),
      maxy: Number(bbox.maxy),
      west: Number(bbox.minx),
      south: Number(bbox.miny),
      east: Number(bbox.maxx),
      north: Number(bbox.maxy),
    }

    window.dispatchEvent(new CustomEvent('bbox-drawn', { detail: bboxDetail }))

    const resolvedLabel = placeName || 'selected area'
    setScanStatus({ active: true, progress: `Scanning ${resolvedLabel}...`, jobId: null })

    try {
      const res = await api.post('/process_bbox', bboxDetail)
      const jobId = res.data?.job_id
      if (!jobId) {
        throw new Error('No job id returned by the scan service.')
      }
      void refreshSubscription()

      setScanStatus({ active: true, progress: `Scanning ${resolvedLabel}...`, jobId })

      const poll = window.setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API_BASE_URL}/jobs/${jobId}`)
          const progressText = statusRes.data?.progress || 'Processing...'
          setScanStatus({ active: true, progress: progressText, jobId })

          if (statusRes.data?.status === 'done' && statusRes.data?.result) {
            window.clearInterval(poll)
            setZones(prev => {
              const next = mergeZones(prev, statusRes.data.result)
              setSummary(current => getScanSummaryFromZones(next, current))
              return next
            })
            setScanStatus({ active: false, progress: `Complete — ${statusRes.data.result.length} new zones found`, jobId })
            setTimeout(() => setScanStatus({ active: false, progress: '', jobId: null }), 5000)
            return
          }

          if (statusRes.data?.status === 'error') {
            window.clearInterval(poll)
            setScanStatus({ active: false, progress: `Failed: ${statusRes.data.error || 'Scan failed'}`, jobId: null })
          }
        } catch {
          window.clearInterval(poll)
          setScanStatus({ active: false, progress: 'Request failed', jobId: null })
        }
      }, 5000)
    } catch (error) {
      if (isUpgradeRequiredError(error)) {
        showUpgradePrompt(error, 'scan')
      }

      setScanStatus({
        active: false,
        progress: isUpgradeRequiredError(error) ? error.message : 'Request failed',
        jobId: null,
      })
    }
  }

  const handleVoiceLocation = (lat: number, lon: number, placeName: string) => {
    setCoordinateLat(String(lat))
    setCoordinateLng(String(lon))
    flyToCoordinates(lat, lon, placeName)
    setPlaceQuery(placeName)

    const bbox = {
      minx: lon - 0.015,
      miny: lat - 0.015,
      maxx: lon + 0.015,
      maxy: lat + 0.015,
    }

    void triggerBboxScan(bbox, placeName)
  }

  useEffect(() => {
    if (!placeQuery.trim()) {
      setPlaceResults([])
      setPlaceError('')
      return
    }

    const timer = window.setTimeout(async () => {
      setPlaceLoading(true)
      setPlaceError('')
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            format: 'jsonv2',
            addressdetails: 1,
            limit: 6,
            q: placeQuery
          },
          headers: {
            'Accept-Language': 'en'
          }
        })
        setPlaceResults(response.data || [])
      } catch (error) {
        setPlaceResults([])
        setPlaceError('Unable to fetch place suggestions. Please try again.')
      } finally {
        setPlaceLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [placeQuery, mapInstance])

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0a0a] text-neutral-100'}`}>
      <UpgradePromptModal
        notice={upgradeNotice}
        onClose={() => setUpgradeNotice(null)}
        onViewPlans={openSubscriptionMenu}
      />

      {sidebarMenuOpen && (
        <div className="fixed inset-0 z-[1200] flex">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSidebarMenuOpen(false)} />
          <aside className="relative z-[1201] w-80 max-w-full border-r border-white/10 bg-[#020b12] px-4 py-6 text-sm text-white shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Menu</p>
                <h2 className="text-lg font-bold">Workspace</h2>
              </div>
              <button
                type="button"
                onClick={() => setSidebarMenuOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900/80 text-slate-200 shadow-sm transition hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                aria-label="Close menu"
                title="Close menu"
              >
                <span className="sr-only">Close menu</span>
                <span aria-hidden="true" className="relative block h-4 w-4">
                  <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rotate-45 rounded-full bg-current" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
                </span>
              </button>
            </div>
            <nav className="space-y-2">
              {['dashboard','subscriptions','profile','downloads'].map(section => (
                <button
                  key={section}
                  onClick={() => openDrawerSection(section as typeof drawerSection)}
                  className={`w-full rounded-2xl px-4 py-3 text-left transition ${drawerSection === section ? 'bg-amber-400/20 text-amber-200' : 'bg-slate-950/80 text-slate-200 hover:bg-slate-800'}`}
                >
                  {section === 'dashboard' ? 'Dashboard' : section === 'subscriptions' ? 'Subscriptions' : section === 'profile' ? 'Profile' : 'Downloaded PDFs'}
                </button>
              ))}
              <button
                type="button"
                onClick={signOut}
                className="w-full rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-left text-rose-200 transition hover:border-rose-500/70 hover:bg-rose-500/20"
              >
                Sign Out
              </button>
            </nav>
            <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-950/90 p-4 text-xs text-slate-300">
              {drawerSection === 'dashboard' && (
                <div>
                  <p className="font-semibold text-white">Quick overview</p>
                  <p className="mt-2 text-slate-400">View recent dashboard metrics, filters, and most urgent zones.</p>
                </div>
              )}
              {drawerSection === 'subscriptions' && (
                <div>
                  <p className="font-semibold text-white">Subscriptions</p>
                  <p className="mt-2 text-slate-400">Choose a plan and unlock premium scanning access.</p>
                </div>
              )}
              {drawerSection === 'profile' && (
                <div>
                  <p className="font-semibold text-white">Profile</p>
                  <p className="mt-2 text-slate-400">Update your name, email, occupation, and password.</p>
                </div>
              )}
              {drawerSection === 'downloads' && (
                <div>
                  <p className="font-semibold text-white">Downloaded PDFs</p>
                  <p className="mt-2 text-slate-400">All previously downloaded reports are listed here.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar */}
      <div className="flex w-96 flex-shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0a0a0a]">
      {/* <AssistantPanel /> */}
        {/* Header */}
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-2 mb-1">
            
            <a href="/" className="flex items-center gap-3" aria-label="Nirikshan home"></a>
           <img src="/nirikshan-logo.png" alt="Nirikshan logo" className="h-10 w-10 object-contain" />
            <h1 className="text-lg font-bold text-white">NIRIKSHAN</h1>
            <button
              type="button"
              onClick={() => setSidebarMenuOpen(true)}
              className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-neutral-900 text-slate-200 shadow-sm shadow-black/20 transition hover:border-amber-300/50 hover:bg-neutral-800 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
              aria-label="Open menu"
              title="Open menu"
            >
              <span className="sr-only">Open menu</span>
              <span aria-hidden="true" className="flex h-4 w-5 flex-col justify-between">
                <span className="h-0.5 rounded-full bg-current" />
                <span className="h-0.5 rounded-full bg-current" />
                <span className="h-0.5 rounded-full bg-current" />
              </span>
            </button>
          </div>
          {subscription && (
            <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    {subscription.is_subscribed ? 'Paid plan' : 'Free plan'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {subscription.is_subscribed
                      ? 'Unlimited scans'
                      : `${subscription.scans_remaining ?? 0} scans remaining`}
                  </p>
                </div>
                {!subscription.is_subscribed && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerSection('subscriptions')
                      setSidebarMenuOpen(false)
                    }}
                    className="rounded-lg bg-amber-300 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-amber-200"
                  >
                    Upgrade
                  </button>
                )}
              </div>
              {!subscription.is_subscribed && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-amber-300 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, ((subscription.scans_remaining ?? 0) / 3) * 100))}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="border-b border-white/10 p-4">
  <p className="mb-3 text-xs font-medium tracking-wider text-neutral-400">DETECTION SUMMARY</p>
  <div className="grid grid-cols-2 gap-2">
    {Object.entries(liveSummary.severity_breakdown).map(([level, count]) => (
      <div
        key={level}
        onClick={() => setSeverityFilter(severityFilter === level ? 'ALL' : level)}
        className="cursor-pointer rounded-2xl border border-white/5 bg-neutral-900 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-lg hover:shadow-white/5"
        style={{ borderLeft: `3px solid ${severityColor[level]}` }}
      >
        <div className="text-3xl font-bold" style={{ color: severityColor[level] }}>
          {count}
        </div>
        <div className="mt-0.5 text-xs text-neutral-400">{level}</div>
      </div>
    ))}
  </div>
  <div className="mt-2 rounded-2xl border border-white/5 bg-neutral-900 p-4">
    <div className="text-3xl font-bold text-white">{liveSummary.total}</div>
    <div className="text-xs text-neutral-400">
      Total Flagged Zones
      {zones.length > 931 && (
        <span className="text-green-400 ml-2">+{zones.length - 931} live</span>
      )}
    </div>
  </div>
</div>
<div className="mt-2 rounded-2xl border border-white/5 bg-neutral-900 p-4">
  
  <div className="text-xs text-neutral-400">Microsoft AI Verified</div>
</div>




        {/* Search place */}
        <div className="border-b border-white/10 p-4">
          <p className="mb-2 text-xs font-medium tracking-wider text-neutral-400">SEARCH PLACE</p>
          <input
            type="text"
            value={placeQuery}
            onChange={e => {
              setPlaceQuery(e.target.value)
              setSelectedPlace(null)
            }}
            placeholder="Search for a place or address"
            className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/10"
          />

          <div className="mt-3 rounded-xl border border-white/10 bg-neutral-900/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">Go to coordinates</p>
              <VoiceLocationSearch onLocationFound={handleVoiceLocation} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={coordinateLat}
                onChange={e => setCoordinateLat(e.target.value)}
                placeholder="Lat"
                className="rounded-lg border border-white/10 bg-neutral-800 px-2.5 py-2 text-xs text-white placeholder:text-neutral-500 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/10"
              />
              <input
                type="number"
                value={coordinateLng}
                onChange={e => setCoordinateLng(e.target.value)}
                placeholder="Lng"
                className="rounded-lg border border-white/10 bg-neutral-800 px-2.5 py-2 text-xs text-white placeholder:text-neutral-500 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/10"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const lat = Number(coordinateLat)
                const lng = Number(coordinateLng)
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                  alert('Enter valid latitude and longitude values.')
                  return
                }
                flyToCoordinates(lat, lng, 'Custom coordinates')
              }}
              className="mt-2 w-full rounded-lg bg-amber-400 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-all duration-200 ease-out hover:bg-amber-300"
            >
              Go
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {placeLoading && (
              <div className="rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-xs text-neutral-400">
                Searching for places...
              </div>
            )}
            {!placeLoading && placeError && (
              <div className="rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-xs text-rose-300">
                {placeError}
              </div>
            )}
            {!placeLoading && placeQuery.trim() && placeResults.length === 0 && !placeError && (
              <div className="rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-xs text-neutral-400">
                No places found for "{placeQuery}".
              </div>
            )}
            {placeResults.length > 0 && (
              <div className="space-y-2">
                {placeResults.map(result => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => {
                      setSelectedPlace(result)
                      flyToLatLng(Number(result.lat), Number(result.lon), result.display_name)
                    }}
                    className="w-full text-left rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white transition-all duration-150 ease-out hover:border-amber-400/50 hover:bg-neutral-800"
                  >
                    <div className="font-semibold text-white truncate">{result.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedPlace && (
            <div className="mt-3 rounded-xl border border-white/10 bg-neutral-900 px-3 py-3 text-xs text-neutral-300">
              <div className="font-semibold text-white truncate">Selected: {selectedPlace.display_name}</div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => flyToLatLng(Number(selectedPlace.lat), Number(selectedPlace.lon))}
                  className="w-full rounded-xl bg-amber-400 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-400/10 active:scale-[0.98]"
                >
                  Center map
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlace(null)
                    setPlaceQuery('')
                    setPlaceResults([])
                  }}
                  className="w-full rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98]"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          {selectedZone && (
            <button
              onClick={() => flyToLatLng(selectedZone.lat, selectedZone.lon, selectedZone.location_name)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98]"
            >
              Use selected zone coordinates
            </button>
          )}
        </div>

        {/* Severity filter */}
        <div className="border-b border-white/10 p-4">
          <p className="mb-2 text-xs font-medium tracking-wider text-neutral-400">FILTER BY SEVERITY</p>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-medium text-white focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/10">
            <option value="ALL">All severities</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>

        {/* Violation type filter */}
        <div className="border-b border-white/10 p-4">
          <p className="mb-2 text-xs font-medium tracking-wider text-neutral-400">FILTER BY VIOLATION</p>
          <select value={violationFilter} onChange={e => setViolationFilter(e.target.value)} className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-medium text-white focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/10">
            <option value="ALL">All violation types</option>
            {Array.from(new Set(zones.map(zone => zone.violation_type).filter(Boolean))).sort().map(type => (
              <option key={type} value={type}>{formatViolationType(type)}</option>
            ))}
          </select>
        </div>
        {/* Vision filters */}
        <div className="border-b border-white/10 p-4">
          <p className="mb-2 text-xs font-medium tracking-wider text-neutral-400">FILTER BY VISION</p>
          <select value={visionFilter} onChange={e => setVisionFilter(e.target.value)} className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-medium text-white focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/10">
            <option value="ALL">All vision results</option>
            <option value="verified">Vision verified</option>
            <option value="crane">Crane detected</option>
            <option value="building">Building detected</option>
            <option value="container">Container detected</option>
          </select>
        </div>

    {selectedZone?.microsoft_confirmed && (
  <div className="mb-3 ml-2 inline-block rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
    ✓ Microsoft Verified
  </div>
)}

        {/* Selected zone detail */}
        {selectedZone && (
          <div className="p-4 border-b border-slate-200">
            <p className="text-xs text-slate-500 mb-2 font-medium tracking-wider">SELECTED ZONE</p>
            <div
              className="rounded-lg p-4 bg-sky-50"
              style={{ borderLeft: `3px solid ${severityColor[selectedZone.severity]}` }}
            >
              {/* Severity + score */}
              <div className="flex justify-between items-center mb-3">
                <span
                  className="text-xs font-bold px-2 py-1 rounded"
                  style={{ backgroundColor: severityColor[selectedZone.severity] }}
                >
                  {selectedZone.severity}
                </span>
                <span className="text-sm font-bold text-white">
                  {selectedZone.risk_score}/100
                </span>
              </div>

              {/* Violation type */}
              <div
                className="text-xs px-2 py-1 rounded mb-3 inline-block"
                style={{ backgroundColor: violationColor[selectedZone.violation_type] || '#374151' }}
              >
                {formatViolationType(selectedZone.violation_type)}
              </div>

              <div className="mb-3 rounded bg-sky-50 border border-slate-200 p-3 text-xs space-y-1.5">
                <div className="flex justify-between gap-3 text-slate-500">
                  <span>Location</span>
                  <span className="font-semibold text-slate-900 text-right">{selectedZone.location_name || selectedZone.area_label}</span>
                </div>
              </div>

              <div className="mb-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {selectedZone.construction_detected && (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-600 text-white">
                      Vision Verified
                    </span>
                  )}
                  {selectedZone.crane_present && (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-orange-600 text-white">
                      Active Construction
                    </span>
                  )}
                </div>

                <div className="rounded bg-sky-50 border border-slate-200 p-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Vision confidence</span>
                    <span className="font-bold text-slate-900">
                      {formatZoneVisionConfidence(selectedZone)}
                    </span>
                  </div>
                  {selectedObjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedObjects.map(obj => (
                        <span
                          key={obj}
                          className="text-xs px-2 py-1 rounded bg-sky-50 text-slate-900"
                        >
                          {visionObjectLabels[obj]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3 text-xs">
                <div className="mb-3 flex items-center gap-2 border-b border-blue-100 pb-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <p className="font-semibold text-slate-800">ISRO Bhuvan land-use verification</p>
                </div>
                <div className="rounded-md bg-blue-50 p-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700">Classification</p>
                  <p className="mt-1 font-semibold leading-snug text-slate-900">{selectedZone.bhuvan_land_type || 'Not assessed'}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-slate-100 p-2">
                    <p className="text-[11px] text-slate-500">Overlap</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{typeof selectedZone.bhuvan_overlap_percent === 'number' ? `${selectedZone.bhuvan_overlap_percent.toFixed(1)}%` : 'Not available'}</p>
                  </div>
                  <div className="rounded-md border border-slate-100 p-2">
                    <p className="text-[11px] text-slate-500">Confidence</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{selectedZone.bhuvan_confidence || 'Assessment pending'}</p>
                  </div>
                </div>
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <p className="text-[11px] text-slate-500">OSM overlays</p>
                  <p className="mt-0.5 break-words font-medium leading-snug text-slate-800">{selectedZone.osm_flags?.map(flag => flag.replace(/_/g, ' ')).join(', ') || 'None'}</p>
                </div>
              </div>
              {/* Details */}
              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span className="text-slate-500">Area</span>
                  <span>{(selectedZone.area_sqm / 10000).toFixed(2)} hectares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinates</span>
                  <span>{selectedZone.lat.toFixed(4)}, {selectedZone.lon.toFixed(4)}</span>
                </div>
                {selectedZone.bbox && (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">BBox (minX, minY, maxX, maxY)</span>
                    <span className="text-right">{selectedZone.bbox.minx}, {selectedZone.bbox.miny}, {selectedZone.bbox.maxx}, {selectedZone.bbox.maxy}</span>
                  </div>
                )}
              </div>

             {/* Download report button */}

  <button
    type="button"
    onClick={downloadReport}
    disabled={reportStatus === 'Preparing PDF...'}
    className="mt-3 w-full block text-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold py-2 px-4 rounded transition-colors"
  >
    {reportStatus === 'Preparing PDF...' ? 'Preparing Report...' : 'Download Official Report (PDF)'}
  </button>
  {reportStatus && (
    <p className={`mt-2 text-xs ${reportStatus === 'Report downloaded.' ? 'text-emerald-600' : reportStatus === 'Preparing PDF...' ? 'text-slate-500' : 'text-red-600'}`}>
      {reportStatus}
    </p>
  )}
              {/* Before/After slider */}
<ZoneImages zoneId={selectedZone.id} lat={selectedZone.lat} lon={selectedZone.lon} />
<ZoneChatbot
  zoneId={selectedZone.id}
  onUpgradeRequired={(error) => showUpgradePrompt(error, 'ai_chatbot')}
/>
            </div>
          </div>
        )}

        {/* Zone count */}
        <div className="p-4 mt-auto">
          <p className="text-xs text-slate-500">
            Showing {filtered.length} of {zones.length} zones
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {drawerSection === 'subscriptions' && (
          <div className={`flex h-full w-full items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-slate-100 text-slate-900'}`}>
            <div className={`w-full max-w-4xl rounded-[28px] border p-8 shadow-2xl ${theme === 'dark' ? 'border-white/10 bg-[#091321] text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <div className="mb-8 text-center">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-400">Subscriptions</p>
                <h2 className="mt-2 text-3xl font-bold">Choose your plan</h2>
                {subscriptionStatus && (
                  <p className={`mt-3 text-sm ${subscriptionStatus.includes('active') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {subscriptionStatus}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: '1 Month', price: '₹499', value: '1 Month', description: 'Best for short-term access' },
                  { label: '3 Months', price: '₹1,259', value: '3 Months', description: 'Great for ongoing project work' },
                  { label: '1 Year', price: '₹5,500', value: '1 Year', description: 'Best value for long-term use' },
                ].map(option => {
                  const isSelected = subscription?.is_subscribed && subscription.plan === option.value
                  const isActive = Boolean(subscription?.is_subscribed)
                  const isActivating = activatingPlan === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => void handleActivatePlan(option.value)}
                      disabled={Boolean(activatingPlan) || isSelected}
                      className={`rounded-[24px] border p-6 text-left transition hover:-translate-y-1 ${isSelected ? 'cursor-not-allowed border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-500/10 opacity-70' : theme === 'dark' ? 'border-white/10 bg-slate-900/40 hover:bg-slate-900' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-lg font-bold">{option.label}</p>
                        {isSelected && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="mt-4 text-3xl font-black text-amber-400">{option.price}</p>
                      <p className="mt-2 text-sm text-slate-400">{option.description}</p>

                      <div className="mt-6 rounded-2xl border border-dashed border-slate-500/30 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                        {isActivating ? 'Activating...' : isSelected ? 'Active plan' : isActive ? 'Switch plan' : 'Buy now'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {drawerSection === 'profile' && (
          <div className={`flex h-full w-full items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-slate-100 text-slate-900'}`}>
            <div className={`w-full max-w-lg rounded-[28px] border p-8 shadow-2xl ${theme === 'dark' ? 'border-white/10 bg-[#091321] text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <div className="mb-6 text-center">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-400">Profile</p>
                <h2 className="mt-2 text-3xl font-bold">Your account</h2>
              </div>

              <div className="space-y-4">
                <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Name</p>
                  <p className="mt-2 text-xl font-semibold">{profile.name || 'Nirikshan User'}</p>
                </div>

                <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</p>
                  <p className="mt-2 text-lg font-medium">{profile.email || 'No email saved'}</p>
                </div>

                <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Plan</p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-lg font-semibold">
                      {subscription?.is_subscribed ? subscription.plan || 'Paid' : 'Free'}
                    </p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${subscription?.is_subscribed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {subscription?.is_subscribed ? 'Active' : 'Free'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {drawerSection === 'downloads' && (
          <div className={`flex h-full w-full items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-slate-100 text-slate-900'}`}>
            <div className={`w-full max-w-2xl rounded-[28px] border p-8 shadow-2xl ${theme === 'dark' ? 'border-white/10 bg-[#091321] text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <div className="mb-6 text-center">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-400">Downloads</p>
                <h2 className="mt-2 text-3xl font-bold">Downloaded PDFs</h2>
              </div>
              <div className="space-y-3">
                {downloadHistory.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-400">
                    No reports downloaded yet.
                  </p>
                ) : downloadHistory.map(item => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                    <p className="text-sm font-semibold">{item.fileName}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(item.date).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {drawerSection === 'dashboard' && (
          <MapContainer
          center={[19.42, 72.85]}
          zoom={12}
          className="h-full w-full"
          style={{ background: '#1a1a2e' }}
        >
          <MapInstanceSetter onCreated={setMapInstance} />
          <TileLayer
  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
  attribution="© Google"
  maxZoom={21}
/>
          <WMSTileLayer
            url="https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms"
            layers="lulc50k"
            format="image/png"
            transparent={true}
            opacity={0.5}
            version="1.1.1"
            attribution="ISRO Bhuvan LULC"
          />
          {filtered.map(zone => (
            <CircleMarker
              key={zone.id}
              center={[zone.lat, zone.lon]}
              radius={severityRadius[zone.severity]}
              pathOptions={{
                color: severityColor[zone.severity],
                fillColor: severityColor[zone.severity],
                fillOpacity: zone.severity === 'CRITICAL' ? 0.9 : 0.6,
                weight: zone.severity === 'CRITICAL' ? 2 : 1
              }}
              eventHandlers={{
                click: () => setSelectedZone(zone)
              }}
            >
              <Popup>
                <div style={{ fontSize: '12px', minWidth: '150px' }}>
                  <strong>{zone.location_name || zone.area_label}</strong>
                  <br />
                  <strong style={{ color: severityColor[zone.severity] }}>
                    {zone.severity}
                  </strong>
                  <br />
                  {formatViolationType(zone.violation_type)}
                  <br />
                  Area: {(zone.area_sqm / 10000).toFixed(2)} ha
                  <br />
                  Score: {zone.risk_score}/100
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {/* Pulsing markers for critical zones */}
          {filtered.filter(z => z.severity === 'CRITICAL').map(z => (
            <PulsingMarker key={`pulse-${z.id}`} lat={z.lat} lng={z.lon} />
          ))}

          {/* Drawn circle preview */}
          {circleCenter && circleRadius != null && (
            <Circle center={circleCenter} radius={circleRadius} pathOptions={{ color: '#3b82f6', fillOpacity: 0.08 }} />
          )}
          {/* drawn polygon preview (if any) */}
          {drawnGeoJSON && (
            <GeoJsonLayer data={drawnGeoJSON} />
          )}
     
          {/* Map instance setter */}
          <MapInstanceSetter onCreated={setMapInstance} />
          {/* Map draw handler: mousedown -> drag -> mouseup */}
          <MapDrawHandler
            drawMode={drawMode}
            onStart={(latlng) => {
              setCircleCenter([latlng.lat, latlng.lng])
              setCircleRadius(0)
            }}
            onMove={(radiusMeters) => {
              setCircleRadius(radiusMeters)
            }}
            onEnd={() => {
              setDrawMode('none')
            }}
            onFinish={(geojson) => {
              // receive polygon GeoJSON from freehand pen
              setDrawnGeoJSON(geojson)
              // exit draw mode
              setDrawMode('none')
            }}
          />
          {/* Leaflet Draw control */}
          <DrawControl
            drawMode={drawMode}
            onDraw={(g)=>{
              setDrawnGeoJSON(g)
              setCircleCenter(null)
              setCircleRadius(null)
              setCircleDrawn(false)
            }}
            onCircleDraw={(center, radius) => {
              setDrawnGeoJSON(null)
              setCircleCenter(center)
              setCircleRadius(radius)
              setCircleDrawn(true)
            }}
          />
        </MapContainer>
        )}

        {/* Map overlay — stats */}
        {drawerSection === 'dashboard' && (
        <>
        <div className="absolute top-4 right-4 bg-sky-50/90 backdrop-blur rounded-lg p-3 z-[1000] shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Active filters</p>
          <p className="text-sm font-bold text-slate-900">{filtered.length} zones visible</p>
        </div>
        {/* Draw controls at bottom */}
        <div className="absolute left-4 bottom-4 z-[1100]">
          <div className="flex gap-2">
            <button
              onClick={() => {
                // toggle pen draw mode; clear previous shapes
                if (drawMode !== 'pen') {
                  setCircleCenter(null)
                  setCircleRadius(null)
                }
                setDrawMode(drawMode === 'pen' ? 'none' : 'pen')
              }}
              className={`px-3 py-2 rounded-md font-medium ${drawMode === 'pen' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
            >
              {drawMode === 'pen' ? 'Drawing (pen) — drag to draw' : 'Pen'}
            </button>
            <button
              onClick={() => {
                // reset draw UI
                setCircleCenter(null); setCircleRadius(null); setDrawMode('none')
                setDrawnGeoJSON(null)
                setSelectedZone(null)
                setSeverityFilter('ALL')
                setViolationFilter('ALL')
                // clear any pen-drawn layers
                try {
                  const g = (window as any).drawnLayerGroup
                  if (g && g.clearLayers) g.clearLayers()
                } catch {}

                // reload original zones + summary from backend
                axios.get(`${API_BASE_URL}/zones`)
                  .then(res => setZones(res.data.zones))
                  .catch(() => {})
                axios.get(`${API_BASE_URL}/zones/summary`)
                  .then(res => setSummary(res.data))
                  .catch(() => {})
              }}
              className="px-3 py-2 rounded-md font-medium bg-slate-200 text-slate-900 hover:bg-slate-300"
            >
              Clear
            </button>
            {circleCenter && circleRadius != null && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setCircleRadius(prev => Math.max(50, (prev || 0) - 50))
                    setCircleDrawn(true)
                  }}
                  className="px-3 py-2 rounded-md font-medium bg-slate-200 text-slate-900 hover:bg-slate-300"
                >
                  −
                </button>
                <span className="px-3 py-2 rounded-md bg-slate-200 text-slate-900 text-xs font-medium">
                  {(circleRadius/1000).toFixed(2)} km
                </span>
                <button
                  onClick={() => {
                    setCircleRadius(prev => (prev || 0) + 50)
                    setCircleDrawn(true)
                  }}
                  className="px-3 py-2 rounded-md font-medium bg-slate-200 text-slate-900 hover:bg-slate-300"
                >
                  +
                </button>
              </div>
            )}
            
 
            <button
  onClick={() => {
  if (!drawnGeoJSON) return
  setScanStatus({ active: true, progress: 'Initializing satellite scan...', jobId: null })
  
  api.post('/zones/query', drawnGeoJSON).then(res => {
    const jobId = res.data.job_id
    if (!jobId) return
    void refreshSubscription()
    setScanStatus({ active: true, progress: 'Connecting to Google Earth Engine...', jobId })

    const poll = setInterval(() => {
      axios.get(`${API_BASE_URL}/jobs/${jobId}`).then(r => {
        setScanStatus({ active: true, progress: r.data.progress || 'Processing...', jobId })

        if (r.data.status === 'done' && r.data.result) {
          clearInterval(poll)
          setZones(prev => {
            const next = mergeZones(prev, r.data.result)
            setSummary(current => getScanSummaryFromZones(next, current))
            return next
          })
          setScanStatus({ active: false, progress: `Complete — ${r.data.result.length} new zones found`, jobId })
          setTimeout(() => setScanStatus({ active: false, progress: '', jobId: null }), 5000)
        } else if (r.data.status === 'error') {
          clearInterval(poll)
          setScanStatus({ active: false, progress: `Failed: ${r.data.error}`, jobId: null })
        }
      })
    }, 5000)
  }).catch(error => {
    if (isUpgradeRequiredError(error)) {
      showUpgradePrompt(error, 'scan')
    }

    setScanStatus({
      active: false,
      progress: isUpgradeRequiredError(error) ? error.message : 'Request failed',
      jobId: null,
    })
  })
}}
  className="px-3 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
>
  Get Data
</button>
          </div>
        </div>

        {/* Scan progress overlay */}
{(scanStatus.active || scanStatus.progress) && (
  <div className="absolute right-4 top-4 z-[1200] w-[min(22rem,calc(100%-2rem))]">
    <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-[0_20px_55px_rgba(15,23,42,0.32)] backdrop-blur-md ${
      scanStatus.active
        ? 'border-cyan-200/70 bg-slate-950/95'
        : scanStatus.progress.startsWith('Complete')
        ? 'border-emerald-300/70 bg-slate-950/95'
        : 'border-rose-300/70 bg-slate-950/95'
    }`}>
      <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full border border-cyan-300/20" />
      <div className="pointer-events-none absolute -right-4 -top-8 h-24 w-24 rounded-full border border-cyan-300/15" />
      <div className="pointer-events-none absolute right-12 top-7 h-1 w-1 rounded-full bg-cyan-100 shadow-[0_0_10px_3px_rgba(165,243,252,0.7)]" />
      <div className="pointer-events-none absolute right-20 top-16 h-1 w-1 rounded-full bg-white/80" />

      <div className="relative flex items-start gap-3">
        <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-xl shadow-lg ${
          scanStatus.active ? 'border-cyan-300/40 bg-cyan-400/15 shadow-cyan-500/15' : scanStatus.progress.startsWith('Complete') ? 'border-emerald-300/40 bg-emerald-400/15' : 'border-rose-300/40 bg-rose-400/15'
        }`}>
          <span className={scanStatus.active ? 'animate-bounce' : ''} role="img" aria-label="rocket">&#128640;</span>
          {scanStatus.active && <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-cyan-400 animate-pulse" />}
        </div>
        <div className="min-w-0 flex-1 pr-5">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${scanStatus.active ? 'bg-cyan-400 animate-pulse' : scanStatus.progress.startsWith('Complete') ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">AutoSentinel mission</p>
          </div>
          <p className="mt-1 text-sm font-bold text-white">
            {scanStatus.active ? 'Live satellite scan' : scanStatus.progress.startsWith('Complete') ? 'Scan complete' : 'Scan needs attention'}
          </p>
          <p className="mt-1 truncate text-xs text-slate-300">{scanStatus.progress}</p>
        </div>
      </div>

      {scanStatus.active && (
        <>
          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-all duration-700" style={{ width: `${Math.max(8, (([
              'Connecting', 'Fetching 2019', 'Fetching 2026', 'Running NDBI', 'Downloading', 'Extracting',
              'Generating Bhuvan', 'Exporting OSM', 'Applying Bhuvan'
            ].findIndex(s => scanStatus.progress.includes(s)) + 1) / 9) * 100)}%` }} />
          </div>
          <div className="relative mt-4 space-y-2.5">
          {[
            'Connecting to Google Earth Engine...',
            'Fetching 2019 satellite imagery...',
            'Fetching 2026 satellite imagery...',
            'Running NDBI change detection...',
            'Downloading results from GEE...',
            'Extracting flagged zones...',
            'Generating Bhuvan land-use layer...',
            'Exporting OSM infrastructure layers...',
            'Applying Bhuvan and OSM legal scoring...',
          ].map((step, i) => {
            const steps = [
              'Connecting',
              'Fetching 2019',
              'Fetching 2026',
              'Running NDBI',
              'Downloading',
              'Extracting',
              'Generating Bhuvan',
              'Exporting OSM',
              'Applying Bhuvan',
            ]
            const currentIdx = Math.max(0, steps.findIndex(s => scanStatus.progress.includes(s)))
            const done = currentIdx > i
            const active = currentIdx === i

            return (
              <div key={i} className="flex items-center gap-2.5">
                <div className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] font-bold ${
                  done ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                  : active ? 'border-cyan-300 bg-cyan-400/20 text-cyan-200 animate-pulse'
                  : 'border-slate-600 bg-slate-800 text-slate-500'
                }`} />
                <p className={`text-xs ${
                  done ? 'text-emerald-300'
                  : active ? 'font-medium text-cyan-100'
                  : 'text-slate-500'
                }`}>{step}</p>
              </div>
            )
          })}
          </div>
          <div className="relative mt-4 flex items-center justify-between border-t border-slate-700/70 pt-3 text-[10px] font-medium uppercase tracking-[0.13em] text-slate-400">
            <span>Earth Engine link</span><span className="text-cyan-300">Telemetry live</span>
          </div>
        </>
      )}
    </div>
  </div>
)}
        </>
        )}
      </div>
    </div>
  )
}

  function GeoJsonLayer({ data }: { data: any }) {
    const map = useMap()
    useEffect(() => {
      if (!map) return
      const layer = L.geoJSON(data as any, { style: { color: '#3b82f6', weight: 2, fillOpacity: 0.05 } }).addTo(map)
      return () => {
        try { map.removeLayer(layer) } catch {}
      }
    }, [data, map])
    return null
  }

  function DrawControl({ drawMode, onDraw, onCircleDraw }: { drawMode: 'none'|'circle'|'pen'|'rectangle', onDraw: (geojson: any|null) => void, onCircleDraw?: (center: [number, number], radius: number) => void }) {
    const map = useMap()
    useEffect(() => {
      ;(window as any).mapInstance = map
      const drawnItems = new (window as any).L.FeatureGroup()
      map.addLayer(drawnItems)

      const drawControl = new (L.Control as any).Draw({
        // Use option objects instead of booleans for nested option groups.
        // Passing `true` previously caused leaflet-draw to attempt to set
        // properties on a boolean (TypeError). Empty objects enable defaults.
        edit: { featureGroup: drawnItems, edit: {}, remove: {} },
        draw: {
          polygon: {},
          polyline: false,
          rectangle: {},
          circle: false,
          marker: false,
          circlemarker: false
        },
        circle: {
          shapeOptions: { color: '#3b82f6', weight: 2, fillOpacity: 0.1 },
          showRadius: true,
          metric: true
        }
      })

      map.on(((window as any).L.Draw.Event).CREATED, function (e: any) {
        const layer = e.layer
        drawnItems.clearLayers()
        drawnItems.addLayer(layer)
        // If user drew a rectangle, trigger backend pipeline for that bbox
        const geojson = layer.toGeoJSON()
        const type = e.layerType || (geojson && geojson.geometry && geojson.geometry.type)
        if (type === 'Rectangle' || type === 'Polygon') {
          // For rectangles created by leaflet-draw, layer.getBounds() is available
          if (layer.getBounds) {
            const b = layer.getBounds()
            const minLat = b.getSouth()
            const minLng = b.getWest()
            const maxLat = b.getNorth()
            const maxLng = b.getEast()
            const bboxDetail = {
              minx: minLng,
              miny: minLat,
              maxx: maxLng,
              maxy: maxLat,
              west: minLng,
              south: minLat,
              east: maxLng,
              north: maxLat
            }
            window.dispatchEvent(new CustomEvent('bbox-drawn', { detail: bboxDetail }))
            onDraw(geojson)
            return
          }
        }
        onDraw(geojson)
      })

      map.on(((window as any).L.Draw.Event).DELETED, function () {
        drawnItems.clearLayers()
        onDraw(null)
      })

      // toggle control (only enable leaflet-draw when explicitly requested)
      if (drawMode === 'rectangle') {
        map.addControl(drawControl)
      }

      return () => {
        try { map.removeControl(drawControl) } catch {}
        map.removeLayer(drawnItems)
      }
    }, [map, drawMode])
    return null
  }

  function MapDrawHandler({ drawMode, onStart, onMove, onEnd, onFinish }:{ drawMode:'none'|'circle'|'pen', onStart:(latlng:{lat:number,lng:number})=>void, onMove:(radius:number)=>void, onEnd:()=>void, onFinish?: (geojson:any)=>void }) {
    const startRef = useRef<{lat:number,lng:number}|null>(null)
    const drawingRef = useRef<{layer?: L.Polyline, latlngs: L.LatLng[]} | null>(null)
    const map = useMap()

    useMapEvents({
      mousedown(e:any) {
        if (drawMode === 'pen') {
          // ensure a dedicated layer group exists for drawn shapes
          if (!(window as any).drawnLayerGroup) {
            try {
              const g = new L.FeatureGroup()
              map.addLayer(g)
              ;(window as any).drawnLayerGroup = g
            } catch {}
          }

          // disable map interactions so drawing doesn't pan/zoom the map
          try { map.dragging.disable() } catch {}
          try { map.doubleClickZoom.disable() } catch {}
          try { map.scrollWheelZoom.disable() } catch {}
          try { map.touchZoom.disable && map.touchZoom.disable() } catch {}

          // start freehand
          drawingRef.current = { latlngs: [e.latlng] }
          const poly = L.polyline([e.latlng], { color: '#3b82f6', weight: 2 })
          try { (window as any).drawnLayerGroup.addLayer(poly) } catch { poly.addTo(map) }
          drawingRef.current.layer = poly
          return
        }
        if (drawMode !== 'circle') return
        startRef.current = e.latlng
        onStart(e.latlng)
      },
      mousemove(e:any) {
        if (drawMode === 'pen' && drawingRef.current) {
          drawingRef.current.latlngs.push(e.latlng)
          drawingRef.current.layer!.setLatLngs(drawingRef.current.latlngs)
          return
        }
        if (drawMode !== 'circle' || !startRef.current) return
        const a = startRef.current
        const b = e.latlng
        const toRad = (deg: number) => deg * Math.PI / 180
        const R = 6371000
        const dLat = toRad(b.lat - a.lat)
        const dLon = toRad(b.lng - a.lng)
        const aa = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa))
        const dist = R * c
        onMove(dist)
      },
      mouseup(_e:any) {
        if (drawMode === 'pen' && drawingRef.current) {
          // finalize polygon (close ring)
          const latlngs = drawingRef.current.latlngs
          // remove small or accidental strokes
          if (latlngs.length > 2) {
            const poly = L.polygon(latlngs, { color: '#3b82f6', weight: 2, fillOpacity: 0.05 })
            // replace the temporary polyline with polygon
            drawingRef.current.layer!.remove()
            try { (window as any).drawnLayerGroup.addLayer(poly) } catch { poly.addTo(map) }
            const geo = poly.toGeoJSON()
            if (onFinish) onFinish(geo)
          } else {
            // not enough points, clean up
            drawingRef.current.layer!.remove()
          }
          drawingRef.current = null
          // re-enable map interactions
          try { map.dragging.enable() } catch {}
          try { map.doubleClickZoom.enable() } catch {}
          try { map.scrollWheelZoom.enable() } catch {}
          try { map.touchZoom.enable && map.touchZoom.enable() } catch {}
          return
        }
        if (drawMode !== 'circle' || !startRef.current) return
        // final move already reported; clear start and finish
        startRef.current = null
        onEnd()
      }
    })
    return null
  }

  function MapInstanceSetter({ onCreated }: { onCreated: (map: any) => void }) {
    const map = useMap()
    useEffect(() => {
      onCreated(map)
      const timer = window.setTimeout(() => map.invalidateSize(), 80)
      return () => window.clearTimeout(timer)
    }, [map, onCreated])
    return null
  }

  function PulsingMarker({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap()
    useEffect(() => {
      const html = `<div class="pulse-container"><div class="pulse-ring"></div><div class="pulse-dot"></div></div>`
      const icon = L.divIcon({ className: 'pulse-icon', html, iconSize: [24,24], iconAnchor: [12,12] })
      const m = L.marker([lat, lng], { icon, interactive: false })
      m.addTo(map)
      return () => { try { map.removeLayer(m) } catch {} }
    }, [lat, lng, map])
    return null
  }

export default function App() {
  if (window.location.pathname === '/') return <LandingPage />
  if (window.location.pathname === '/login') return <LoginPage />
  return isAuthenticated() ? <Dashboard /> : <LoginPage />
}
