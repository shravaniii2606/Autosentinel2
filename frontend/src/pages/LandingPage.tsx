import beforeSatelliteImage from '../../../data/images/zone_127_before.png'
import afterSatelliteImage from '../../../data/images/zone_127_after.png'
import SatelliteViewer from '../SatelliteViewer';
const capabilities = [
  {
    number: '01',
    title: 'Satellite change detection',
    text: 'Compare Sentinel-2 imagery year over year using NDBI change detection, so new built surfaces stand out from the surrounding terrain.',
  },
  {
    number: '02',
    title: 'Legal risk cross-reference',
    text: 'Match construction alerts against forest, agricultural and protected-land categories to focus inspection resources where the legal exposure is highest.',
  },
  {
    number: '03',
    title: 'Building footprint verification',
    text: 'Cross-check flagged areas against Microsoft global building footprints to help distinguish a real structure from a transient image signal.',
  },
  {
    number: '04',
    title: 'Voice-enabled AI assistant',
    text: 'Ask why a zone is high risk, review scan evidence in plain language, and retain context from earlier investigations.',
  },
]

const workflow = [
  ['01', 'Draw an area on the map', 'Outline a ward, parcel or suspected site in the live map.'],
  ['02', 'Satellite scan runs', 'AutoSentinel compares recent Sentinel-2 imagery against the prior year.'],
  ['03', 'Zones are prioritised', 'New construction is scored by severity and land-use risk.'],
  ['04', 'Investigate with evidence', 'Download a PDF report or question the AI assistant about the scan.'],
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#07100f] text-slate-100 selection:bg-amber-400 selection:text-slate-950">
      <header className="border-b border-white/10 bg-[#07100f]/95">
        <div className="mx-auto flex max-w-7xl items-center px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="AutoSentinel home">
            <img src="/autosentinel-logo.svg" alt="" className="h-8 w-8" />
            <span className="text-sm font-semibold tracking-[0.18em] text-white">AUTOSENTINEL</span>
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-18 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:py-28">
          <div>
            <p className="mb-5 font-mono text-xs tracking-[0.18em] text-amber-300">SATELLITE INTELLIGENCE FOR LAND AUTHORITIES</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find unauthorised construction before it becomes irreversible.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              AutoSentinel compares Sentinel-2 imagery year over year to surface new construction, rank its risk, and give municipal officers evidence they can act on.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="/dashboard" className="inline-flex justify-center bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300">SCAN AN AREA</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 font-mono text-xs text-slate-400">
              <span>INPUT: SENTINEL-2</span><span>METHOD: NDBI CHANGE</span><span>OUTPUT: ACTIONABLE ZONES</span>
            </div>
          </div>

            <div className="border border-slate-600 bg-[#0b1716] p-3 shadow-2xl shadow-black/30">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3 font-mono text-[10px] tracking-wider text-slate-400">
                <span>SENTINEL-2</span>
              </div>
              <SatelliteViewer />
            </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <p className="font-mono text-sm font-semibold tracking-[0.16em] text-amber-300 sm:text-base">WORKFLOW</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold text-white">From a drawn boundary to an inspection-ready record.</h2>
        <div className="mt-11 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {workflow.map(([number, title, text], index) => (
            <article key={number} className="relative border border-white/10 bg-[#0a1514] p-6">
              <span className="font-mono text-xs text-amber-300">{number}</span>
              <div className="my-5 h-px bg-slate-700"><div className="h-px bg-amber-400" style={{ width: `${(index + 1) * 25}%` }} /></div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0a1514]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-sm font-semibold tracking-[0.16em] text-amber-300 sm:text-base">CAPABILITIES</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Evidence built for the way enforcement teams work.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">Each alert brings image change, land-use context, verification signals and a clear path to documentation into one investigation workflow.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {capabilities.map((capability) => <CapabilityCard key={capability.number} {...capability} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="font-mono text-sm font-semibold tracking-[0.16em] text-amber-300 sm:text-base">LIVE MAP WORKSPACE</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Draw, scan, prioritise.</h2>
            <p className="mt-5 text-base leading-7 text-slate-300">Start from any area of interest. Browse known violation zones or draw a new boundary and return to a ranked list of construction signals with severity, land-use and verification context.</p>
          </div>
          <MapPreview />
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050a0a]">
        <div className="border-t border-white/10 py-5 text-center font-mono text-[10px] tracking-wider text-slate-500">AUTOSENTINEL / CONSTRUCTION INTELLIGENCE</div>
      </footer>
    </main>
  )
}



function CapabilityCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="border border-white/10 bg-[#07100f] p-6 transition hover:border-amber-400/60"><p className="font-mono text-xs text-amber-300">{number}</p><h3 className="mt-8 text-xl font-semibold text-white">{title}</h3><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{text}</p></article>
}

function MapPreview() {
  return <div className="relative min-h-90 overflow-hidden border border-slate-600 bg-[#183128] p-5">
    <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(24deg,transparent_18%,#5f7d43_18%,#5f7d43_31%,transparent_31%),linear-gradient(128deg,transparent_38%,#426b58_38%,#426b58_49%,transparent_49%),linear-gradient(90deg,rgba(224,244,207,.11)_1px,transparent_1px),linear-gradient(rgba(224,244,207,.11)_1px,transparent_1px)] [background-size:auto,auto,38px_38px,38px_38px]" />
    <div className="absolute left-[9%] top-[23%] h-12 w-21 rotate-[-8deg] border border-[#a7bd75]/70 bg-[#66854c]/70" />
    <div className="absolute left-[35%] top-[19%] h-16 w-27 rotate-[10deg] border border-[#a7bd75]/70 bg-[#719457]/70" />
    <div className="absolute right-[12%] top-[27%] h-13 w-22 rotate-[-4deg] border border-[#a7bd75]/70 bg-[#63864c]/70" />
    <div className="absolute left-[17%] bottom-[22%] h-14 w-25 rotate-[7deg] border border-[#a7bd75]/70 bg-[#5e7f48]/70" />
    <div className="absolute right-[27%] bottom-[18%] h-15 w-30 rotate-[-10deg] border border-[#a7bd75]/70 bg-[#6e9054]/70" />
    <div className="relative flex items-center justify-between font-mono text-[10px] text-slate-200"><span>DAHISAR, MUMBAI</span><span>LIVE SATELLITE VIEW</span></div>
    <div className="absolute left-[32%] top-[28%] h-35 w-48 rotate-[-7deg] border-2 border-amber-300 bg-amber-400/15" />
    <div className="absolute left-[43%] top-[42%] grid h-8 w-8 place-items-center rounded-full border-2 border-amber-100 bg-amber-400 text-[11px] font-bold text-slate-950">!</div>
    <div className="absolute left-[51%] top-[35%] rounded bg-[#07100f]/90 px-2 py-1 font-mono text-[9px] text-amber-200">NEW CONSTRUCTION</div>
    <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#07100f]/95 px-4 py-3 font-mono text-[10px]"><span className="text-slate-300">INSPECTION ZONE SELECTED</span><span className="text-amber-300">1 HIGH-RISK ALERT</span></div>
  </div>
}
