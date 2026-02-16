export default function Sparkline({ points = [], stroke = '#2d6a4f', height = 48 }) {
  if (!points.length) {
    return <div className="chart-placeholder">No data yet</div>
  }

  const series = points.length === 1 ? [points[0], points[0]] : points
  const max = Math.max(...series)
  const min = Math.min(...series)
  const range = max - min || 1

  const coords = series.map((value, index) => {
    const x = (index / (series.length - 1)) * 100
    const y = ((max - value) / range) * 100
    return `${x},${y}`
  })

  return (
    <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" height={height}>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
    </svg>
  )
}
