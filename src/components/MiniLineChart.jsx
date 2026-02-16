import { useId } from 'react'

export default function MiniLineChart({ points = [10, 22, 18, 40, 32, 60, 52] }) {
  const gradientId = useId()
  const width = 300
  const height = 140
  const padding = 18
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = (width - padding * 2) / (points.length - 1)

  const coords = points.map((value, index) => {
    const x = padding + index * step
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${path} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`

  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(140, 200, 230, 0.6)" />
          <stop offset="100%" stopColor="rgba(140, 200, 230, 0)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={path} stroke="#6f86a4" strokeWidth="2" fill="none" />
      {coords.map((point, index) => (
        <circle
          key={`${point.x}-${index}`}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="#ffffff"
          stroke="#7b8ea8"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}
