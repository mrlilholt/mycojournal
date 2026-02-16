export default function Sparkline({ points = [], stroke = '#2d6a4f', height = 48 }) {
  if (!points.length) {
    return <div className="chart-placeholder">No data yet</div>
  }

  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1

  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * 100
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
