export default function MultiLineChart({ series = [], height = 180 }) {
  const cleanSeries = series
    .map((item) => ({
      ...item,
      values: Array.isArray(item.values) ? item.values : []
    }))
    .filter((item) => item.values.length)

  if (!cleanSeries.length) {
    return <div className="chart-placeholder">No data yet</div>
  }

  const maxLen = Math.max(...cleanSeries.map((item) => item.values.length))
  if (maxLen < 2) {
    return <div className="chart-placeholder">Not enough data</div>
  }

  const width = 640
  const padding = 20
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  const normalizeValue = (value, min, max) => {
    if (!Number.isFinite(value)) return null
    if (max === min) return 0.5
    return 1 - (value - min) / (max - min)
  }

  const paths = cleanSeries.map((item) => {
    const numeric = item.values.filter((value) => Number.isFinite(value))
    const min = numeric.length ? Math.min(...numeric) : 0
    const max = numeric.length ? Math.max(...numeric) : 1

    let d = ''
    let started = false
    item.values.forEach((value, index) => {
      const normalized = normalizeValue(value, min, max)
      if (normalized == null) {
        started = false
        return
      }
      const x = padding + (index / (maxLen - 1)) * innerWidth
      const y = padding + normalized * innerHeight
      if (!started) {
        d += `M ${x} ${y}`
        started = true
      } else {
        d += ` L ${x} ${y}`
      }
    })
    return { ...item, d }
  })

  return (
    <div className="multi-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <g className="multi-line-grid">
          {[0.25, 0.5, 0.75].map((pos) => (
            <line
              key={pos}
              x1={padding}
              x2={width - padding}
              y1={padding + innerHeight * pos}
              y2={padding + innerHeight * pos}
            />
          ))}
        </g>
        {paths.map((item) => (
          <path
            key={item.label}
            d={item.d}
            fill="none"
            stroke={item.color || '#4a73c5'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="multi-line-legend">
        {cleanSeries.map((item) => (
          <div key={item.label} className="legend-item">
            <span className="legend-swatch" style={{ background: item.color || '#4a73c5' }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
