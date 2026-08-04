// @ts-nocheck
import SatelliteViewer from '../SatelliteViewer'
import { useState, useRef, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

/* ─── Data ────────────────────────────────────────────────────── */
const capabilities = [
  { number: '01', title: 'Custom Satellite Scan', text: 'Choose any area of interest and run a dedicated satellite scan that adapts to your boundary, survey priorities, and land-use concerns.' },
  { number: '02', title: 'AI Change Detection', text: 'Detect new construction and structural change with machine learning models tuned for Sentinel-2 imagery and temporal analysis.' },
  { number: '03', title: 'Risk Score Analysis', text: 'Score each detected zone by legal risk, land-use conflict and construction severity to help teams prioritise follow-up actions.' },
  { number: '04', title: 'Detailed Investigation Report', text: 'Generate a full investigation report with satellite evidence, legal context and recommendations for enforcement or inspection.' },
  { number: '05', title: 'Before vs After Comparison', text: 'Visualise change through satellite imagery comparisons that show exactly where and when new structures appeared.' },
  { number: '06', title: 'Geo-Tagged Property Mapping', text: 'Map each alert to a precise property location so inspectors can verify the exact parcel and property boundary on the ground.' },
  { number: '07', title: 'Real-Time Alerts', text: 'Receive continuous alert updates as new signals appear, helping teams act quickly on the most urgent construction events.' },
  { number: '08', title: 'ISRO & Microsoft Verified', text: 'Combine ISRO Bhuvan land-use verification with Microsoft building footprint confirmation for stronger confidence and faster validation.' },
]

const workflow = [
  {
    number: '01',
    title: 'Draw an area on the map',
    text: 'Outline a ward, parcel or suspected site directly on the live satellite map using the pen tool. Drag points to refine your boundary.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    color: '#38bdf8',
    statusLabel: 'AOI Selector Ready — Click to Draw',
  },
  {
    number: '02',
    title: 'Satellite scan runs',
    text: 'AutoSentinel pulls Sentinel-2 L2A imagery and runs a band-8/11 NDBI change-detection pass over your selected area. Results arrive in minutes.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V11.4" />
      </svg>
    ),
    color: '#fb923c',
    statusLabel: 'Sentinel-2 L2A Band 8/11 NDBI Scan',
  },
  {
    number: '03',
    title: 'Zones are prioritised',
    text: 'New construction is ranked by severity, density, and land-use conflict. High-priority zones surface first so enforcement acts where it matters most.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2zm0-10V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: '#a78bfa',
    statusLabel: '3 High-Priority Zones Detected',
  },
  {
    number: '04',
    title: 'Investigate with evidence',
    text: 'Download a full PDF report with satellite evidence, legal land-use context, and before/after comparisons. Or ask the AI assistant live questions about the scan.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: '#86efac',
    statusLabel: 'Inspection PDF Ready for Export',
  },
]

/* ─── Inline Map Draw Component ───────────────────────────────── */
function MapEventsHandler({ isPenActive, confirmed, setPoints, setMousePos }) {
  useMapEvents({
    click(e) {
      if (!isPenActive || confirmed) return
      setPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]])
    },
    mousemove(e) {
      if (!isPenActive || confirmed) return
      setMousePos([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

function InlineDrawMap() {
  const [points, setPoints] = useState<[number, number][]>([])
  const [mousePos, setMousePos] = useState<[number, number] | null>(null)
  const [isPenActive, setIsPenActive] = useState(true)
  const [confirmed, setConfirmed] = useState(false)

  const samplePolygon: [number, number][] = [
    [19.2550, 72.8480],
    [19.2590, 72.8570],
    [19.2520, 72.8630],
    [19.2450, 72.8550],
    [19.2480, 72.8460],
  ]

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-sky-500/30 bg-[#060e14]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#08151f] px-3 py-2">
        <button
          onClick={() => setIsPenActive(p => !p)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
            isPenActive
              ? 'bg-sky-400 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          🖊️ Pen {isPenActive ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => { setPoints(samplePolygon); setConfirmed(false) }}
          className="rounded-xl border border-cyan-400/40 bg-cyan-950/60 px-3 py-1.5 text-[11px] font-bold text-cyan-300 transition hover:bg-cyan-900/80"
        >
          🎯 Load Preset
        </button>
        <button
          onClick={() => { setPoints([]); setConfirmed(false) }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
        >
          🗑️ Clear
        </button>
        <span className="ml-auto font-mono text-[10px] text-slate-500">
          {points.length} vertices · {points.length >= 3 ? `~${(points.length * 0.48).toFixed(1)} km²` : '—'}
        </span>
      </div>

      {/* Map */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <MapContainer
          center={[19.25, 72.8546]}
          zoom={14}
          scrollWheelZoom
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
          className="rounded-b-2xl"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <MapEventsHandler
            isPenActive={isPenActive}
            confirmed={confirmed}
            setPoints={setPoints}
            setMousePos={setMousePos}
          />
          {points.length >= 3 && (
            <Polygon
              positions={points}
              pathOptions={{ color: '#38bdf8', weight: 3, fillColor: '#0284c7', fillOpacity: 0.3, dashArray: '6 6' }}
            />
          )}
          {points.length >= 2 && points.length < 3 && (
            <Polyline positions={points} pathOptions={{ color: '#38bdf8', weight: 3, dashArray: '6 6' }} />
          )}
          {mousePos && points.length > 0 && !confirmed && (
            <Polyline
              positions={[points[points.length - 1], mousePos]}
              pathOptions={{ color: '#38bdf8', weight: 2, dashArray: '4 4', opacity: 0.6 }}
            />
          )}
          {points.map((pt, i) => (
            <CircleMarker
              key={i}
              center={pt}
              radius={5}
              pathOptions={{ color: '#fff', fillColor: '#38bdf8', fillOpacity: 1, weight: 2 }}
            />
          ))}
        </MapContainer>

        {/* Confirm button floating on map */}
        <div className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2">
          {confirmed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl border border-emerald-400/60 bg-emerald-950/90 px-4 py-2 text-xs font-bold text-emerald-200 shadow-xl backdrop-blur">
                ✓ AOI Confirmed — Ready for Sentinel-2 Scan
              </div>
              <a
                href="/login"
                className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg hover:bg-amber-300"
              >
                PROCEED TO DASHBOARD 🚀
              </a>
            </div>
          ) : (
            <button
              disabled={points.length < 3}
              onClick={() => setConfirmed(true)}
              className={`rounded-xl px-5 py-2 text-xs font-bold shadow-xl backdrop-blur transition-all ${
                points.length >= 3
                  ? 'bg-sky-400 text-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.5)] hover:scale-105'
                  : 'cursor-not-allowed bg-slate-800/90 text-slate-500'
              }`}
            >
              {points.length < 3 ? `Click map to place ${3 - points.length} more point${3 - points.length === 1 ? '' : 's'}` : 'CONFIRM AOI SELECTION ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Satellite Before/After Compare Slider ─────────────────── */
function SatelliteScanCompare() {
  const [sliderX, setSliderX] = useState(50) // percent
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    setSliderX(pct)
  }, [])

  const onMouseDown = () => { dragging.current = true }
  const onMouseMove = (e: React.MouseEvent) => { if (dragging.current) updateSlider(e.clientX) }
  const onMouseUp = () => { dragging.current = false }
  const onTouchMove = (e: React.TouchEvent) => { updateSlider(e.touches[0].clientX) }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-orange-500/30 bg-[#0d0a06]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#130e06] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_6px_#fb923c]" />
          <span className="font-mono text-[11px] font-bold text-orange-400">SENTINEL-2 CHANGE DETECTION — DAHISAR WARD, MUMBAI</span>
        </div>
        <div className="flex gap-3">
          <span className="rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">BEFORE · 2020</span>
          <span className="rounded-lg bg-red-950/60 border border-red-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-red-400">AFTER · 2024</span>
        </div>
      </div>

      {/* Slider Area */}
      <div
        ref={containerRef}
        className="relative flex-1 select-none overflow-hidden cursor-col-resize"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
      >
        {/* AFTER image (right/background — full width) */}
        <img
          src="/sat_after.png"
          alt="After construction 2024"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* BEFORE image (left/foreground — clipped by slider) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderX}%` }}
        >
          <img
            src="/sat_before.png"
            alt="Before construction 2020"
            className="h-full object-cover"
            style={{ width: containerRef.current?.clientWidth ?? 600 }}
            draggable={false}
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute inset-y-0 z-20 flex items-center justify-center"
          style={{ left: `calc(${sliderX}% - 1px)` }}
        >
          <div className="h-full w-0.5 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          {/* Drag handle */}
          <div
            className="absolute flex h-10 w-10 cursor-col-resize items-center justify-center rounded-full border-2 border-white/80 bg-slate-950/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] backdrop-blur"
            onMouseDown={e => { e.stopPropagation(); dragging.current = true }}
          >
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-lg border border-emerald-500/50 bg-black/70 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-400 backdrop-blur">
          ← BEFORE · 2020
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-lg border border-red-500/50 bg-black/70 px-2.5 py-1 font-mono text-[11px] font-bold text-red-400 backdrop-blur">
          AFTER · 2024 →
        </div>

        {/* Hint */}
        {sliderX > 45 && sliderX < 55 && (
          <div className="pointer-events-none absolute top-3 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 font-mono text-[10px] text-slate-300 backdrop-blur">
            ← drag to compare →
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#130e06]">
        {[
          { label: 'CHANGE DETECTED', value: '73%', color: '#ef4444' },
          { label: 'NEW STRUCTURES', value: '41', color: '#fb923c' },
          { label: 'AREA AFFECTED', value: '2.3 km²', color: '#fbbf24' },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col items-center py-2.5">
            <span className="font-mono text-[10px] text-slate-500">{stat.label}</span>
            <span className="mt-0.5 font-mono text-lg font-black" style={{ color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Workflow Section ────────────────────────────────────────── */
function WorkflowSection({ activeIndex, onActiveChange }: { activeIndex: number; onActiveChange: (i: number) => void }) {
  const step = workflow[activeIndex]
  const color = step.color

  return (
    <div className="mt-10 w-full">
      {/* Step Tab Bar — single horizontal line */}
      <div className="flex w-full overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1 backdrop-blur-md">
        {workflow.map((item, idx) => {
          const isActive = idx === activeIndex
          return (
            <button
              key={item.number}
              onClick={() => onActiveChange(idx)}
              className={`group relative flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                isActive ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
              style={{
                background: isActive ? `linear-gradient(135deg, ${item.color}22, ${item.color}12)` : undefined,
                boxShadow: isActive ? `0 0 20px ${item.color}30` : undefined,
                borderRadius: isActive ? '0.75rem' : undefined,
              }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black transition-all"
                style={{
                  backgroundColor: isActive ? item.color : `${item.color}20`,
                  color: isActive ? '#050d0c' : item.color,
                }}
              >
                {idx + 1}
              </span>
              <span className="hidden truncate sm:block">{item.title}</span>
              <span className="block truncate font-mono sm:hidden">{item.number}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Step Detail Panel */}
      <div
        key={activeIndex}
        className="mt-5 flex flex-col gap-5 overflow-hidden rounded-3xl border bg-black/30 p-6 backdrop-blur-md transition-all duration-300 lg:flex-row"
        style={{
          borderColor: `${color}40`,
          boxShadow: `0 0 40px ${color}18, inset 0 0 20px ${color}08`,
        }}
      >
        {/* Left: Step Info */}
        <div className="flex shrink-0 flex-col lg:w-72">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}22`, color }}
            >
              {step.icon}
            </div>
            <div>
              <span className="font-mono text-xs font-bold tracking-widest" style={{ color }}>
                STEP {activeIndex + 1} / 4
              </span>
              <p className="font-mono text-xs text-slate-500">{step.number}</p>
            </div>
          </div>

          <h3
            className="mt-5 text-2xl font-extrabold italic leading-snug text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {step.title}
          </h3>

          <p
            className="mt-3 flex-1 text-sm leading-relaxed text-slate-300"
            style={{ fontFamily: 'Fraunces, Georgia, serif' }}
          >
            {step.text}
          </p>

          {/* Live status */}
          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-slate-300">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ backgroundColor: color }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            </div>
            <span>{step.statusLabel}</span>
          </div>

          {/* Navigation arrows */}
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => onActiveChange(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => onActiveChange(Math.min(workflow.length - 1, activeIndex + 1))}
              disabled={activeIndex === workflow.length - 1}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              style={{ borderColor: activeIndex < workflow.length - 1 ? `${color}60` : undefined }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right: Map (only for step 1) or visual for others */}
        <div className="flex-1 overflow-hidden rounded-2xl" style={{ minHeight: '360px' }}>
          {activeIndex === 0 ? (
            <InlineDrawMap />
          ) : activeIndex === 1 ? (
            <SatelliteScanCompare />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed"
              style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}
            >
              <div
                className="flex h-20 w-20 items-center justify-center rounded-3xl"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {step.icon && <span className="scale-[2.5]">{step.icon}</span>}
              </div>
              <div className="text-center">
                <p className="font-mono text-sm font-bold tracking-widest" style={{ color }}>
                  {step.statusLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">This step is automated by AutoSentinel</p>
              </div>
              {activeIndex === 2 && (
                <div className="flex gap-3">
                  {['HIGH', 'MED', 'LOW'].map((lvl, i) => (
                    <div key={lvl} className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-center">
                      <p className="text-[10px] font-bold" style={{ color: ['#ef4444','#fb923c','#86efac'][i] }}>{lvl}</p>
                      <p className="mt-0.5 text-lg font-black text-white">{[3, 7, 12][i]}</p>
                    </div>
                  ))}
                </div>
              )}
              {activeIndex === 3 && (
                <a
                  href="/login"
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:bg-amber-300"
                >
                  GO TO DASHBOARD 🚀
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Landing Page ────────────────────────────────────────────── */
export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState(0)
  const [scrollBg, setScrollBg] = useState(0)
  const ticking = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const scrollY = window.scrollY
        const heroHeight = window.innerHeight
        const progress = Math.min(1, Math.max(0, (scrollY - heroHeight * 0.4) / (heroHeight * 0.8)))
        setScrollBg(progress)
        ticking.current = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <main className="relative min-h-screen text-slate-100 selection:bg-amber-400 selection:text-slate-950" style={{ backgroundColor: '#060d0c' }}>
      {/* ── Scroll-driven parallax backgrounds ── */}
      {/* Layer 1: Demolition scene (hero) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/bg_demolition.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          opacity: Math.max(0, (1 - scrollBg * 2) * 0.45),
          transition: 'opacity 0.05s linear',
          filter: 'brightness(0.45) saturate(0.8)',
        }}
      />
      {/* Layer 2: Satellite scan scene (mid/bottom) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/bg_satellite_scan.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          opacity: Math.min(0.45, scrollBg * 0.55),
          transition: 'opacity 0.05s linear',
          filter: 'brightness(0.4) saturate(0.7)',
        }}
      />

      {/* Edge vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 110% 90% at 50% 50%, transparent 25%, #05090a 100%)',
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-[60] border-b border-white/10 bg-[#07100f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <a href="/" className="flex items-center gap-3" aria-label="Nirikshan home">
            <img src="/nirikshan-logo.png" alt="Nirikshan logo" className="h-20 w-20 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]" />
            <span className="text-xl font-extrabold tracking-[0.1em] text-white sm:text-2xl" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>NIRIKSHAN</span>
          </a>
          <nav className="flex flex-wrap justify-center gap-2" aria-label="Landing page navigation" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>
            <a href="/login" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-amber-300/60 hover:bg-amber-300/15">Dashboard</a>
            <button type="button" onClick={() => setShowDemo(true)} className="cursor-pointer rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-amber-300/60 hover:bg-amber-300/15">Demo</button>
            <button type="button" onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="cursor-pointer rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-sky-300/60 hover:bg-sky-300/15">Workflow</button>
            <button type="button" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="cursor-pointer rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-violet-300/60 hover:bg-violet-300/15">Features</button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-[1] overflow-hidden border-b border-white/10">
        <div className="relative mx-auto max-w-7xl px-5 pt-8 pb-16 sm:px-8 lg:pt-10 lg:pb-24">
          <div className="mx-auto max-w-4xl text-center">
            <p
              className="mb-7 text-xl font-black italic tracking-[0.1em] text-transparent drop-shadow-[0_0_18px_rgba(251,191,36,.35)] sm:text-2xl"
              style={{ fontFamily: "'Mileast Italic', Georgia, serif", backgroundImage: 'linear-gradient(90deg, #fde68a, #fbbf24, #fb923c)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}
            >
              SATELLITE INTELLIGENCE FOR LAND AUTHORITIES
            </p>
            <h1 className="max-w-4xl text-5xl font-bold leading-[.98] tracking-[-0.035em] text-white sm:text-7xl lg:text-8xl" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
              Built in <em className="font-serif font-medium text-amber-300">secret.</em><br />
              Detected from <span className="bg-gradient-to-r from-sky-200 via-cyan-300 to-amber-300 bg-clip-text font-serif italic tracking-[-0.075em] text-transparent">space.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-xl font-semibold italic leading-snug text-slate-200 sm:text-2xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Construction leaves footprints.<br />We find them first.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="/login" className="inline-flex justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-400/20">
                SCAN AN AREA
              </a>
              <button
                onClick={() => setShowDemo(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-white/10 hover:-translate-y-0.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                WATCH DEMO
              </button>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 font-mono text-xs text-slate-400">
              <span>INPUT: SENTINEL-2</span><span>METHOD: NDBI CHANGE</span><span>OUTPUT: ACTIONABLE ZONES</span>
            </div>
          </div>
          <div className="mx-auto mt-12 max-w-4xl border border-slate-600 bg-[#0b1716] p-3 shadow-2xl shadow-black/30">
            <div className="mb-3 flex items-center border-b border-white/10 pb-3 font-mono text-[10px] tracking-wider text-slate-400">
              <span>SENTINEL-2</span>
            </div>
            <SatelliteViewer />
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="relative z-[1] overflow-hidden border-y border-white/[0.06] px-5 py-16 sm:px-8">
        <div className="relative mx-auto max-w-7xl">
          <p className="text-center text-4xl font-black italic tracking-[0.08em] text-amber-300 sm:text-5xl" style={{ fontFamily: "'Mileast Italic', Georgia, serif" }}>WORKFLOW</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-2xl font-black italic tracking-tight text-white sm:text-3xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Four steps. One clear path to action.
          </h2>
          <WorkflowSection activeIndex={activeWorkflow} onActiveChange={setActiveWorkflow} />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-[1] border-y border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-3xl font-extrabold tracking-[0.14em] text-amber-300 sm:text-4xl" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>FEATURES</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>Evidence built for the way enforcement teams work.</h2>
            </div>
          </div>
          <div className="mt-10 space-y-6">
            <div className="feature-marquee rounded-[32px] border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
              <div className="feature-track feature-track--left">
                {[...capabilities, ...capabilities].map((c, i) => <CapabilityCard key={`${c.number}-${i}`} {...c} />)}
              </div>
            </div>
            <div className="feature-marquee rounded-[32px] border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
              <div className="feature-track feature-track--right">
                {[...capabilities, ...capabilities].reverse().map((c, i) => <CapabilityCard key={`r-${c.number}-${i}`} {...c} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="relative z-[1] border-t border-white/10 px-5 py-14 sm:px-8 sm:py-16" style={{ background: 'rgba(5,10,10,0.92)', fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.65fr)_repeat(3,minmax(130px,.55fr))]">
            <div className="max-w-md">
              <a href="/" className="inline-flex items-center gap-3" aria-label="Nirikshan home">
                <img src="/nirikshan-logo.png" alt="Nirikshan logo" className="h-20 w-20 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.3)]" />
                <span className="text-xl font-extrabold tracking-[0.1em] text-white">NIRIKSHAN</span>
              </a>
              <p className="mt-5 text-base leading-7 text-slate-400">Turn satellite imagery into clear, evidence-backed construction intelligence for land authorities and inspection teams.</p>
              <div className="mt-7 flex gap-3">
                <a href="#footer" aria-label="Instagram" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-slate-300 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-300/10 hover:text-amber-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none" /></svg>
                </a>
                <a href="#footer" aria-label="LinkedIn" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-slate-300 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-300/10 hover:text-amber-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M6.5 8.3H3.2V20h3.3V8.3ZM4.85 3C3.8 3 3 3.8 3 4.85c0 1.02.8 1.85 1.82 1.85h.03c1.07 0 1.84-.83 1.84-1.85C6.67 3.8 5.9 3 4.85 3ZM20.9 13.3c0-3.53-1.89-5.17-4.42-5.17-2.04 0-2.96 1.12-3.47 1.9V8.3H9.7c.04 1.14 0 11.7 0 11.7H13v-6.54c0-.35.03-.7.13-.95.28-.7.9-1.43 1.95-1.43 1.38 0 1.93 1.06 1.93 2.61V20h3.3v-6.7h.59Z" /></svg>
                </a>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-slate-500">PRODUCT</p>
              <nav className="mt-5 flex flex-col gap-4 text-base text-slate-300">
                <a href="#features" className="transition hover:text-amber-300">Features</a>
                <a href="#workflow" className="transition hover:text-amber-300">How it works</a>
                <a href="/login" className="transition hover:text-amber-300">Open dashboard</a>
              </nav>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-slate-500">INTELLIGENCE</p>
              <nav className="mt-5 flex flex-col gap-4 text-base text-slate-300">
                <a href="#features" className="transition hover:text-amber-300">Satellite scans</a>
                <a href="#features" className="transition hover:text-amber-300">Risk analysis</a>
                <a href="#features" className="transition hover:text-amber-300">Investigation reports</a>
              </nav>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-slate-500">PLATFORM</p>
              <div className="mt-5 flex flex-col gap-4 text-base text-slate-300">
                <span>ISRO Bhuvan context</span>
                <span>Microsoft verification</span>
                <span>Built for India</span>
              </div>
            </div>
          </div>
          <div className="mt-9 flex flex-col gap-3 border-t border-white/10 pt-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 AutoSentinel · Founded by DOMinators</p>
            <p className="font-semibold tracking-[0.08em] text-slate-400">MADE IN INDIA</p>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowDemo(false)}>
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowDemo(false)} className="absolute -top-10 right-0 text-sm font-medium text-white/70 transition-colors hover:text-white">
              CLOSE ✕
            </button>
            <video src="/demo.mp4" controls autoPlay className="w-full rounded-xl border border-white/10 shadow-2xl" />
          </div>
        </div>
      )}
    </main>
  )
}

/* ─── Capability Card ─────────────────────────────────────────── */
function CapabilityCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <article className="feature-card rounded-[32px] border border-slate-700/70 bg-[#071016]/90 p-6 text-left shadow-xl shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/70 hover:bg-[#0f1c1a] hover:shadow-[0_24px_58px_rgba(16,185,129,.18)]" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>
      <p className="text-xs font-bold uppercase tracking-[0.26em] text-amber-300">{number}</p>
      <h3 className="mt-6 text-xl font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
    </article>
  )
}
