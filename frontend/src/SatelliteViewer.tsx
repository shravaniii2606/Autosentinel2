export default function SatelliteViewer() {
  return (
    <div
      style={{
        background: '#0d0f14',
        borderRadius: '16px',
        padding: '12px',
        border: '1px solid #232733',
      }}
    >
      <model-viewer
        src="/models/sentinel6.glb"
        alt="Sentinel 2 satellite"
        auto-rotate
        auto-rotate-delay="0"
        rotation-per-second="18deg"
        camera-controls
        disable-zoom
        shadow-intensity="1"
        exposure="0.9"
        environment-image="neutral"
        style={{
          width: '100%',
          height: '380px',
          background: 'transparent',
        }}
      />
    </div>
  );
}