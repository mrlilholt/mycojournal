import { Link } from 'react-router-dom'
import HealthBadge from './HealthBadge.jsx'
import TagPills from './TagPills.jsx'
import { formatDate, formatDateTime } from '../../utils/date.js'
import { formatTemp } from '../../utils/units.js'
import { getLatestLog } from '../../utils/data.js'

export default function GrowCard({ grow, logs, events, settings, onQuickLog, onComplete }) {
  const latestLog = getLatestLog(logs, grow.id)

  return (
    <div className="grow-card">
      <div className="grow-card-header">
        <div>
          <h3>{grow.name}</h3>
          <div className="subtext">
            {grow.species} · {grow.method} · {grow.phase}
          </div>
        </div>
        <HealthBadge grow={grow} logs={logs} events={events} settings={settings} />
      </div>
      <div className="grow-card-body">
        <div className="grow-meta">
          <div>
            <span className="label">Started</span>
            <span>{formatDate(grow.startDate)}</span>
          </div>
          <div>
            <span className="label">Status</span>
            <span className={`status-pill ${grow.status}`}>{grow.status}</span>
          </div>
          <div>
            <span className="label">Latest log</span>
            <span>
              {latestLog
                ? `${formatTemp(latestLog.temp, settings.units)}, ${
                    latestLog.humidity != null ? `${latestLog.humidity}%` : '—'
                  } · ${formatDateTime(
                    latestLog.timestamp
                  )}`
                : 'No logs yet'}
            </span>
          </div>
        </div>
        <TagPills tags={grow.tags} />
      </div>
      <div className="grow-card-actions">
        <Link className="primary-btn" to={`/grows/${grow.id}`}>
          Open
        </Link>
        <button className="secondary-btn" type="button" onClick={() => onQuickLog(grow.id)}>
          Quick Log
        </button>
        {grow.status === 'active' ? (
          <button className="ghost-btn" type="button" onClick={() => onComplete(grow.id)}>
            Complete
          </button>
        ) : null}
      </div>
    </div>
  )
}
