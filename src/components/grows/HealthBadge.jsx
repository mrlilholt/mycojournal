import { useMemo } from 'react'
import { getHealthScore } from '../../utils/health.js'

export default function HealthBadge({ grow, logs, events, settings }) {
  const { score, reasons } = useMemo(
    () => getHealthScore({ grow, logs, events, settings }),
    [grow, logs, events, settings]
  )

  const tone = score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad'

  return (
    <div className={`health-badge ${tone}`}>
      <span>Health {score}</span>
      <details>
        <summary>Why?</summary>
        <ul>
          {reasons.map((reason, index) => (
            <li key={`${reason}-${index}`}>{reason}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
