import { useId } from 'react'

export default function ProgressRing({ value = 0.6, label = '5th week' }) {
  const gradientId = useId()
  const radius = 86
  const stroke = 10
  const normalized = Math.min(Math.max(value, 0), 1)
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - normalized)
  const [main, ...rest] = label.split(' ')
  const sub = rest.join(' ')

  return (
    <div className="progress-ring">
      <svg width="220" height="220" viewBox="0 0 220 220">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dbe9ff" />
            <stop offset="100%" stopColor="#a9c5f7" />
          </linearGradient>
        </defs>
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke="rgba(200, 215, 235, 0.6)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 110 110)"
        />
      </svg>
      <div className="ring-center">
        <div className="week">{main}</div>
        <div className="label">{sub || 'week'}</div>
      </div>
    </div>
  )
}
