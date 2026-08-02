// @ts-nocheck
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// LoginHeroGlobe
//
// Built with Three.js (no React Three Fiber needed — this is a small enough
// scene that plain Three.js in a useEffect is simpler and lighter to ship).
// No external texture/model assets are loaded, so there's nothing to fetch,
// nothing to attribute, and no network dependency at runtime — everything is
// generated procedurally (grid "hologram" globe, ring HUD, orbiting
// satellite, scan beam, particles). The floating cards + radar pulses are
// plain HTML/CSS layered on top of the canvas and kept in sync with the 3D
// scene by projecting the detection point to screen space every frame.
//
// npm install three
// (optional) npm install -D @types/three  — then remove the @ts-nocheck above
// ---------------------------------------------------------------------------

const COLOR_BG = 0x05070a
const COLOR_CYAN = 0x4fd8ff
const COLOR_ORANGE = 0xff6b35

const DETECTION_LAT = 21.5 // India
const DETECTION_LON = 78.5

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function orientBetween(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
  const dir = new THREE.Vector3().subVectors(to, from)
  const len = dir.length()
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.scale.set(1, len, 1)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
}

const CARDS = [
  { id: 'construction', label: 'Construction Detected', accent: 'orange', style: { top: '14%', left: '4%' } },
  { id: 'risk', label: 'Risk Score: 96%', accent: 'orange', style: { top: '8%', right: '6%' } },
  { id: 'forest', label: 'Protected Forest', accent: 'cyan', style: { bottom: '22%', left: '2%' } },
  { id: 'evidence', label: 'Evidence Verified', accent: 'cyan', style: { bottom: '10%', right: '8%' } },
]

export default function LoginHeroGlobe() {
  const mountRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lineSvgRef = useRef<SVGSVGElement>(null)
  const radarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mountEl = mountRef.current
    if (!mountEl) return

    // --- renderer / scene / camera --------------------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(COLOR_BG, 1)
    mountEl.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)

    // --- globe ------------------------------------------------------------
    const globeGroup = new THREE.Group()
    scene.add(globeGroup)

    const solidGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x081422 }),
    )
    globeGroup.add(solidGlobe)

    const gridGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(1.505, 24, 16),
      new THREE.MeshBasicMaterial({ color: COLOR_CYAN, wireframe: true, transparent: true, opacity: 0.32 }),
    )
    globeGroup.add(gridGlobe)

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.68, 48, 48),
      new THREE.MeshBasicMaterial({ color: COLOR_CYAN, transparent: true, opacity: 0.07, side: THREE.BackSide }),
    )
    globeGroup.add(atmosphere)

    // --- HUD rings ----------------------------------------------------------
    const ringA = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.004, 8, 128),
      new THREE.MeshBasicMaterial({ color: COLOR_CYAN, transparent: true, opacity: 0.35 }),
    )
    ringA.rotation.x = Math.PI / 2.4
    scene.add(ringA)

    const ringB = new THREE.Mesh(
      new THREE.TorusGeometry(2.28, 0.003, 8, 128),
      new THREE.MeshBasicMaterial({ color: COLOR_ORANGE, transparent: true, opacity: 0.25 }),
    )
    ringB.rotation.x = Math.PI / 3.2
    ringB.rotation.y = Math.PI / 5
    scene.add(ringB)

    // --- satellite -----------------------------------------------------
    const satellite = new THREE.Group()
    const satBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.14),
      new THREE.MeshBasicMaterial({ color: 0xe8ecf3 }),
    )
    satellite.add(satBody)
    const panelMat = new THREE.MeshBasicMaterial({ color: COLOR_CYAN, transparent: true, opacity: 0.85 })
    const panelGeo = new THREE.PlaneGeometry(0.22, 0.07)
    const panelL = new THREE.Mesh(panelGeo, panelMat)
    panelL.position.x = -0.18
    const panelR = new THREE.Mesh(panelGeo, panelMat)
    panelR.position.x = 0.18
    satellite.add(panelL, panelR)
    scene.add(satellite)

    const ORBIT_RADIUS = 2.6
    const ORBIT_TILT = 0.55 // radians

    // --- scan beam ---------------------------------------------------------
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.05, 1, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: COLOR_ORANGE, transparent: true, opacity: 0.0, side: THREE.DoubleSide }),
    )
    scene.add(beam)

    // --- detection marker on the globe (over India) -----------------------
    const markerLocalPos = latLonToVector3(DETECTION_LAT, DETECTION_LON, 1.51)
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 12, 12),
      new THREE.MeshBasicMaterial({ color: COLOR_ORANGE }),
    )
    marker.position.copy(markerLocalPos)
    globeGroup.add(marker)

    // --- data particles traveling satellite -> marker -----------------------
    const PARTICLE_COUNT = 10
    const particles: THREE.Mesh[] = []
    const particleGeo = new THREE.SphereGeometry(0.012, 6, 6)
    const particleMat = new THREE.MeshBasicMaterial({ color: COLOR_ORANGE, transparent: true })
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = new THREE.Mesh(particleGeo, particleMat.clone())
      scene.add(p)
      particles.push(p)
    }

    // --- lighting (kept minimal — everything above is self-lit/basic) -----
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))

    // --- resize handling ------------------------------------------------
    const resize = () => {
      const w = mountEl.clientWidth
      const h = mountEl.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mountEl)

    // --- animation loop ---------------------------------------------------
    const clock = new THREE.Clock()
    let raf = 0
    const worldMarkerPos = new THREE.Vector3()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      // globe + HUD rotation (slow, independent rates)
      globeGroup.rotation.y = t * 0.05
      ringA.rotation.z = t * 0.06
      ringB.rotation.z = -t * 0.045

      // satellite orbit (tilted circular path)
      const satAngle = t * 0.35
      const rawX = Math.cos(satAngle) * ORBIT_RADIUS
      const rawZ = Math.sin(satAngle) * ORBIT_RADIUS
      satellite.position.set(rawX, Math.sin(satAngle) * ORBIT_RADIUS * Math.sin(ORBIT_TILT), rawZ * Math.cos(ORBIT_TILT))
      satellite.lookAt(0, 0, 0)

      // marker's current world position (globe is rotating)
      worldMarkerPos.copy(markerLocalPos).applyMatrix4(globeGroup.matrixWorld)
      globeGroup.updateMatrixWorld()
      worldMarkerPos.copy(markerLocalPos).applyMatrix4(globeGroup.matrixWorld)

      // scan beam always connects satellite -> detection marker,
      // brightening as the satellite swings past overhead ("a pass")
      orientBetween(beam, satellite.position, worldMarkerPos)
      const alignment = satellite.position.clone().normalize().dot(worldMarkerPos.clone().normalize())
      const pass = Math.max(0, (alignment - 0.4) / 0.6) // 0 when far, 1 when overhead
      ;(beam.material as THREE.MeshBasicMaterial).opacity = 0.05 + pass * 0.5

      // particles: looping travel from satellite to marker, staggered
      particles.forEach((p, i) => {
        const u = (t * 0.6 + i / PARTICLE_COUNT) % 1
        p.position.lerpVectors(satellite.position, worldMarkerPos, u)
        const fade = Math.sin(u * Math.PI) // fades in/out at both ends of the trip
        ;(p.material as THREE.MeshBasicMaterial).opacity = fade * (0.3 + pass * 0.7)
      })

      // slow cinematic camera orbit
      const camAngle = t * 0.045
      camera.position.set(Math.sin(camAngle) * 5, 0.6 + Math.sin(t * 0.08) * 0.15, Math.cos(camAngle) * 5)
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)

      // keep the HTML overlay (cards + connecting lines) pinned to the
      // marker's projected screen position
      const projected = worldMarkerPos.clone().project(camera)
      const w = mountEl.clientWidth
      const h = mountEl.clientHeight
      const sx = (projected.x * 0.5 + 0.5) * w
      const sy = (-projected.y * 0.5 + 0.5) * h

      if (radarRef.current) {
        radarRef.current.style.left = `${sx}px`
        radarRef.current.style.top = `${sy}px`
      }

      const svg = lineSvgRef.current
      if (svg) {
        Object.entries(cardRefs.current).forEach(([id, el]) => {
          const line = svg.querySelector(`[data-line="${id}"]`) as SVGLineElement | null
          if (!el || !line) return
          const rect = el.getBoundingClientRect()
          const mountRect = mountEl.getBoundingClientRect()
          const cx = rect.left - mountRect.left + rect.width / 2
          const cy = rect.top - mountRect.top + rect.height / 2
          line.setAttribute('x1', String(sx))
          line.setAttribute('y1', String(sy))
          line.setAttribute('x2', String(cx))
          line.setAttribute('y2', String(cy))
        })
      }
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      mountEl.removeChild(renderer.domElement)
      ;[solidGlobe, gridGlobe, atmosphere, ringA, ringB, satBody, panelL, panelR, beam, marker, ...particles].forEach(
        (obj) => {
          obj.geometry?.dispose?.()
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat?.dispose?.()
        },
      )
      renderer.dispose()
    }
  }, [])

  return (
    <div className="hero-globe relative h-full w-full overflow-hidden" style={{ background: `#${COLOR_BG.toString(16)}` }}>
      <div ref={mountRef} className="absolute inset-0" />

      <svg ref={lineSvgRef} className="pointer-events-none absolute inset-0 h-full w-full">
        {CARDS.map((c) => (
          <line key={c.id} data-line={c.id} className={`connector connector-${c.accent}`} />
        ))}
      </svg>

      <div ref={radarRef} className="radar-pulse" />

      {CARDS.map((c, i) => (
        <div
          key={c.id}
          ref={(el) => {
            cardRefs.current[c.id] = el
          }}
          className={`glass-card glass-card-${c.accent}`}
          style={{ ...c.style, animationDelay: `${0.4 + i * 0.35}s` }}
        >
          {c.label}
        </div>
      ))}

      <style>{`
        .hero-globe { font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif; }
        .connector {
          stroke-width: 1;
          opacity: 0.35;
          stroke-dasharray: 3 4;
        }
        .connector-orange { stroke: #ff6b35; }
        .connector-cyan { stroke: #4fd8ff; }

        .glass-card {
          position: absolute;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
          color: #f4f6fb;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          opacity: 0;
          animation: card-in 0.8s ease-out forwards, card-float 5s ease-in-out infinite;
          animation-delay: inherit;
        }
        .glass-card-orange { box-shadow: 0 0 24px rgba(255,107,53,0.12); border-color: rgba(255,107,53,0.25); }
        .glass-card-cyan { box-shadow: 0 0 24px rgba(79,216,255,0.12); border-color: rgba(79,216,255,0.25); }

        @keyframes card-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes card-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .radar-pulse {
          position: absolute;
          width: 10px;
          height: 10px;
          margin: -5px 0 0 -5px;
          border-radius: 50%;
          pointer-events: none;
        }
        .radar-pulse::before, .radar-pulse::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid #ff6b35;
          animation: radar-expand 3s ease-out infinite;
        }
        .radar-pulse::after { animation-delay: 1.5s; }
        @keyframes radar-expand {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(14); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .glass-card { animation: card-in 0.4s ease-out forwards; }
          .radar-pulse::before, .radar-pulse::after { animation: none; opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}