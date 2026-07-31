
import SatelliteViewer from '../SatelliteViewer';
import { useState } from 'react'
const capabilities = [
  {
    number: '01',
    title: 'Custom Satellite Scan',
    text: 'Choose any area of interest and run a dedicated satellite scan that adapts to your boundary, survey priorities, and land-use concerns.',
  },
  {
    number: '02',
    title: 'AI Change Detection',
    text: 'Detect new construction and structural change with machine learning models tuned for Sentinel-2 imagery and temporal analysis.',
  },
  {
    number: '03',
    title: 'Risk Score Analysis',
    text: 'Score each detected zone by legal risk, land-use conflict and construction severity to help teams prioritise follow-up actions.',
  },
  {
    number: '04',
    title: 'Detailed Investigation Report',
    text: 'Generate a full investigation report with satellite evidence, legal context and recommendations for enforcement or inspection.',
  },
  {
    number: '05',
    title: 'Before vs After Comparison',
    text: 'Visualise change through satellite imagery comparisons that show exactly where and when new structures appeared.',
  },
  {
    number: '06',
    title: 'Geo-Tagged Property Mapping',
    text: 'Map each alert to a precise property location so inspectors can verify the exact parcel and property boundary on the ground.',
  },
  {
    number: '07',
    title: 'Real-Time Alerts',
    text: 'Receive continuous alert updates as new signals appear, helping teams act quickly on the most urgent construction events.',
  },
  {
    number: '08',
    title: 'ISRO & Microsoft Verified',
    text: 'Combine ISRO Bhuvan land-use verification with Microsoft building footprint confirmation for stronger confidence and faster validation.',
  },
]

const workflow = [
  { number: '01', title: 'Draw an area on the map', text: 'Outline a ward, parcel or suspected site in the live map.' },
  { number: '02', title: 'Satellite scan runs', text: 'AutoSentinel compares recent Sentinel-2 imagery against the prior year.' },
  { number: '03', title: 'Zones are prioritised', text: 'New construction is scored by severity and land-use risk.' },
  { number: '04', title: 'Investigate with evidence', text: 'Download a PDF report or question the AI assistant about the scan.' },
]

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<number | null>(null)
  return (
    <main className="min-h-screen bg-[#07100f] text-slate-100 selection:bg-amber-400 selection:text-slate-950">
      <header className="sticky top-0 z-[60] border-b border-white/10 bg-[#07100f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <a href="/" className="flex items-center gap-3" aria-label="AutoSentinel home">
            <img src="/autosentinel-logo.svg" alt="" className="h-14 w-14" />
            <span className="text-xl font-extrabold tracking-[0.1em] text-white sm:text-2xl" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>AUTOSENTINEL</span>
          </a>
          <nav className="flex flex-wrap justify-center gap-2" aria-label="Landing page navigation" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>
            <a href="/dashboard" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-amber-300/60 hover:bg-amber-300/15">Dashboard</a>
            <button type="button" onClick={() => setShowDemo(true)} className="cursor-pointer rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-amber-300/60 hover:bg-amber-300/15">Demo</button>
            <button type="button" onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="cursor-pointer rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-sky-300/60 hover:bg-sky-300/15">Workflow</button>
            <button type="button" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="cursor-pointer rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-violet-300/60 hover:bg-violet-300/15">Features</button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
  <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] [background-size:48px_48px]" />
  <div className="relative mx-auto max-w-7xl px-5 pt-8 pb-18 sm:px-8 lg:pt-10 lg:pb-24">
    <div className="mx-auto max-w-4xl text-center">
      <p className="mb-7 text-xl font-black italic tracking-[0.1em] text-transparent drop-shadow-[0_0_18px_rgba(251,191,36,.35)] sm:text-2xl" style={{ fontFamily: "'Mileast Italic', Georgia, serif", backgroundImage: 'linear-gradient(90deg, #fde68a, #fbbf24, #fb923c)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>SATELLITE INTELLIGENCE FOR LAND AUTHORITIES</p>
      <h1 className="max-w-4xl text-5xl font-bold leading-[.98] tracking-[-0.035em] text-white [word-spacing:0.12em] sm:text-7xl lg:text-8xl" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
        Built in <em className="font-serif font-medium text-amber-300">secret.</em><br />
        Detected from <span className="bg-gradient-to-r from-sky-200 via-cyan-300 to-amber-300 bg-clip-text font-serif italic tracking-[-0.075em] text-transparent">space.</span>
      </h1>
      <p className="mx-auto mt-7 max-w-2xl text-xl font-semibold italic leading-snug text-slate-200 sm:text-2xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Construction leaves footprints.<br />
        We find them first.
      </p>
      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        <a href="/dashboard" className="inline-flex justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-400/20 active:translate-y-0 active:scale-[0.98]">
          SCAN AN AREA
        </a>
  <button
    onClick={() => setShowDemo(true)}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    WATCH DEMO
  </button>
</div>
            <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 font-mono text-xs text-slate-400">
              <span>INPUT: SENTINEL-2</span><span>METHOD: NDBI CHANGE</span><span>OUTPUT: ACTIONABLE ZONES</span>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-4xl border border-slate-600 bg-[#0b1716] p-3 shadow-2xl shadow-black/30">
  <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3 font-mono text-[10px] tracking-wider text-slate-400">
    <span>SENTINEL-2</span>
  </div>
  <SatelliteViewer />
</div>
        </div>
      </section>

      <section id="workflow" className="relative overflow-hidden border-y border-white/10 bg-[#050d0c] px-5 py-16 sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(56,189,248,.12),transparent_42%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-center text-4xl font-black italic tracking-[0.08em] text-amber-300 sm:text-5xl" style={{ fontFamily: "'Mileast Italic', Georgia, serif" }}>WORKFLOW</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-2xl font-black italic tracking-tight text-white sm:text-3xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Four steps. One clear path to action.</h2>
          <WorkflowGlobe activeIndex={activeWorkflow} onActiveChange={setActiveWorkflow} />
        </div>
      </section>

      <section id="features" className="border-y border-white/10 bg-[#0a1514]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-3xl font-extrabold tracking-[0.14em] text-amber-300 sm:text-4xl" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>FEATURES</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>Evidence built for the way enforcement teams work.</h2>
            </div>
            
          </div>
          <div className="mt-10 space-y-6">
            <div className="feature-marquee rounded-[32px] border border-slate-800/80 bg-[#071012]/80 px-4 py-3">
              <div className="feature-track feature-track--left">
                {[...capabilities, ...capabilities].map((capability, index) => (
                  <CapabilityCard key={`${capability.number}-${index}`} {...capability} />
                ))}
              </div>
            </div>
            <div className="feature-marquee rounded-[32px] border border-slate-800/80 bg-[#071012]/80 px-4 py-3">
              <div className="feature-track feature-track--right">
                {[...capabilities, ...capabilities].reverse().map((capability, index) => (
                  <CapabilityCard key={`reverse-${capability.number}-${index}`} {...capability} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="footer" className="border-t border-white/10 bg-[#050a0a] px-5 py-14 sm:px-8 sm:py-16" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.65fr)_repeat(3,minmax(130px,.55fr))]">
            <div className="max-w-md">
              <a href="/" className="inline-flex items-center gap-3" aria-label="AutoSentinel home">
                <img src="/autosentinel-logo.svg" alt="" className="h-13 w-13" />
                <span className="text-xl font-extrabold tracking-[0.1em] text-white">AUTOSENTINEL</span>
              </a>
              <p className="mt-5 text-base leading-7 text-slate-400">Turn satellite imagery into clear, evidence-backed construction intelligence for land authorities and inspection teams.</p>
              <div className="mt-7 flex gap-3">
                <a href="#footer" aria-label="AutoSentinel on Instagram" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-slate-300 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-300/10 hover:text-amber-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none"/></svg>
                </a>
                <a href="#footer" aria-label="AutoSentinel on LinkedIn" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-slate-300 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-300/10 hover:text-amber-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M6.5 8.3H3.2V20h3.3V8.3ZM4.85 3C3.8 3 3 3.8 3 4.85c0 1.02.8 1.85 1.82 1.85h.03c1.07 0 1.84-.83 1.84-1.85C6.67 3.8 5.9 3 4.85 3ZM20.9 13.3c0-3.53-1.89-5.17-4.42-5.17-2.04 0-2.96 1.12-3.47 1.9V8.3H9.7c.04 1.14 0 11.7 0 11.7H13v-6.54c0-.35.03-.7.13-.95.28-.7.9-1.43 1.95-1.43 1.38 0 1.93 1.06 1.93 2.61V20h3.3v-6.7h.59Z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-slate-500">PRODUCT</p>
              <nav className="mt-5 flex flex-col gap-4 text-base text-slate-300">
                <a href="#features" className="transition hover:text-amber-300">Features</a>
                <a href="#workflow" className="transition hover:text-amber-300">How it works</a>
                <a href="/dashboard" className="transition hover:text-amber-300">Open dashboard</a>
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
      {showDemo && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    onClick={() => setShowDemo(false)}
  >
    <div
      className="relative w-full max-w-4xl"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={() => setShowDemo(false)}
        className="absolute -top-10 right-0 text-sm font-medium text-white/70 transition-colors hover:text-white"
      >
        CLOSE ✕
      </button>
      <video
        src="/demo.mp4"
        controls
        autoPlay
        className="w-full rounded-xl border border-white/10 shadow-2xl"
      />
    </div>
  </div>
)}
    </main>
  )
}



function WorkflowGlobe({ activeIndex, onActiveChange }: { activeIndex: number | null; onActiveChange: (index: number | null) => void }) {
  const active = activeIndex === null ? null : workflow[activeIndex]
  const colours = ['#38bdf8', '#fb923c', '#a78bfa', '#86efac']
  const clips = [
    'polygon(0 0, 50% 0, 50% 50%, 0 50%)',
    'polygon(50% 0, 100% 0, 100% 50%, 50% 50%)',
    'polygon(0 50%, 50% 50%, 50% 100%, 0 100%)',
    'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)',
  ]

  const detailPosition = activeIndex === 0 ? 'left-0 top-[18%] text-right' : activeIndex === 1 ? 'right-0 top-[18%] text-left' : activeIndex === 2 ? 'bottom-[16%] left-0 text-right' : 'bottom-[16%] right-0 text-left'

  return <div className="relative mx-auto mt-16 w-full max-w-[1100px] pb-7 lg:min-h-[650px]">
    <div className="relative mx-auto aspect-square w-full max-w-[620px] overflow-visible rounded-full ring-1 ring-cyan-300/80 shadow-[0_0_16px_rgba(56,189,248,.85),0_0_42px_rgba(139,92,246,.62),0_0_90px_rgba(56,189,248,.28)]">
      <svg className="pointer-events-none absolute -inset-12 z-0 h-[calc(100%+6rem)] w-[calc(100%+6rem)] overflow-visible" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <filter id="orbitGlow"><feGaussianBlur stdDeviation="1.1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id="orbitStroke" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#38bdf8" /><stop offset=".52" stopColor="#a78bfa" /><stop offset="1" stopColor="#fb923c" /></linearGradient>
        </defs>
        <g filter="url(#orbitGlow)">
          <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" path="M 50 4 A 46 46 0 1 1 49.9 4" />
          <path d="M-1.6 2.4 L0 -3.4 L1.6 2.4 L.6 1.6 L0 3.7 L-.6 1.6 Z" fill="url(#orbitStroke)" />
        </g>
      </svg>
      <span className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[135%] font-mono text-sm font-bold text-sky-200 drop-shadow-[0_0_8px_rgba(56,189,248,.95)]">1</span>
      <span className="pointer-events-none absolute right-0 top-1/2 z-20 translate-x-[135%] -translate-y-1/2 font-mono text-sm font-bold text-orange-200 drop-shadow-[0_0_8px_rgba(251,146,60,.95)]">2</span>
      <span className="pointer-events-none absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-[135%] font-mono text-sm font-bold text-violet-200 drop-shadow-[0_0_8px_rgba(167,139,250,.95)]">3</span>
      <span className="pointer-events-none absolute left-0 top-1/2 z-20 -translate-x-[135%] -translate-y-1/2 font-mono text-sm font-bold text-green-200 drop-shadow-[0_0_8px_rgba(134,239,172,.95)]">4</span>
      <div className="relative z-10 h-full w-full overflow-hidden rounded-full bg-[#071312] shadow-[inset_0_0_65px_rgba(0,0,0,.9)]">
        <img src="/earth-blue-marble.jpg" alt="Earth photographed from space" className="absolute inset-0 h-full w-full scale-110 object-cover brightness-75 contrast-125 saturate-150" />
        <div className="pointer-events-none absolute inset-0 bg-violet-500/25 mix-blend-color" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_42%_36%,transparent_34%,rgba(3,7,18,.25)_62%,rgba(1,4,12,.88)_100%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
        <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/25" />
        {workflow.map((item, index) => <button key={item.number} type="button" aria-label={`${item.number}: ${item.title}`} aria-pressed={activeIndex === index} onMouseEnter={() => onActiveChange(index)} onMouseLeave={() => onActiveChange(null)} onFocus={() => onActiveChange(index)} onBlur={() => onActiveChange(null)} onClick={() => onActiveChange(index)} className="group absolute inset-0 z-10 cursor-pointer transition-colors focus:outline-none" style={{ clipPath: clips[index], backgroundColor: activeIndex === index ? `${colours[index]}38` : `${colours[index]}12` }}>
        </button>)}
      </div>
    </div>
    {active && activeIndex !== null && <article className={`absolute z-20 hidden w-[230px] rounded-[2rem] border bg-[#091413]/95 px-6 py-5 shadow-[0_0_40px_rgba(56,189,248,.12)] transition-all duration-300 lg:block ${detailPosition}`} style={{ borderColor: `${colours[activeIndex]}bb`, boxShadow: `0 0 22px ${colours[activeIndex]}35, 0 0 60px ${colours[activeIndex]}18` }}>
      <p className="font-mono text-xs font-bold tracking-[.16em]" style={{ color: colours[activeIndex] }}>{active.number} / WORKFLOW</p>
      <h3 className="mt-2 text-xl font-black italic leading-tight text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{active.title}</h3>
      <p className="mt-3 text-sm font-medium italic leading-6 text-slate-200" style={{ fontFamily: "Fraunces, Georgia, serif" }}>{active.text}</p>
    </article>}
  </div>
}

function CapabilityCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="feature-card rounded-[32px] border border-slate-700/70 bg-[#071016]/90 p-6 text-left shadow-xl shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/70 hover:bg-[#0f1c1a] hover:shadow-[0_24px_58px_rgba(16,185,129,.18)]" style={{ fontFamily: "Aptos, 'Segoe UI', sans-serif" }}>
    <p className="text-xs font-bold uppercase tracking-[0.26em] text-amber-300">{number}</p>
    <h3 className="mt-6 text-xl font-bold tracking-tight text-white">{title}</h3>
    <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
  </article>
}
