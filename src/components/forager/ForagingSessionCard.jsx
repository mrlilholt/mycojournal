import { Link } from 'react-router-dom'
import { formatDateTime } from '../../utils/date.js'
import { formatApproximateLocation } from '../../utils/foragerLocation.js'
import {
  evaluateMushroomWeather,
  formatMushroomForecastLabel,
  formatTemperatureF
} from '../../utils/foragerWeather.js'

export default function ForagingSessionCard({
  session,
  finds,
  expanded,
  onToggle,
  showExact = false
}) {
  const species = Array.from(
    new Set(finds.map((find) => find.species?.commonName || find.species?.latinName).filter(Boolean))
  )
  const photos = finds.flatMap((find) => find.photos || []).slice(0, 4)
  const weatherAssessment = evaluateMushroomWeather(session.weatherSnapshot, session.recentWeather)

  return (
    <div className={`forager-trail-item ${expanded ? 'is-expanded' : ''}`}>
      <div className="forager-trail-item__rail">
        <div className="forager-trail-item__node" />
      </div>
      <div className="forager-trail-item__card glass-surface">
        <button className="forager-trail-item__toggle" type="button" onClick={onToggle} aria-expanded={expanded}>
        <div className="forager-trail-item__meta">
          <span className="badge">{session.outcome === 'no-finds' ? 'No finds' : `${finds.length} finds`}</span>
          <span>{formatDateTime(session.startedAt)}</span>
        </div>
        <div className="forager-trail-item__title-row">
          <h3>{session.title || 'Foraging Session'}</h3>
          <span className="muted">{formatApproximateLocation(session.location, showExact)}</span>
        </div>
        <div className="forager-trail-item__pills">
          {session.weatherSnapshot?.temperatureC != null ? (
            <span className="timeline-pill">{formatTemperatureF(session.weatherSnapshot.temperatureC)}</span>
          ) : null}
          {session.recentWeather?.note ? <span className="timeline-pill">{session.recentWeather.note}</span> : null}
          {weatherAssessment ? (
            <span className={`timeline-pill timeline-pill--${weatherAssessment.rating.toLowerCase().replace(/\s+/g, '-')}`}>
              {formatMushroomForecastLabel(weatherAssessment.rating)}
            </span>
          ) : null}
          {species.length ? <span className="timeline-pill">{species.length} species</span> : null}
        </div>
        {photos.length ? (
          <div className="forager-trail-item__photos">
            {photos.map((photo) => (
              <img key={photo.id || photo.url} src={photo.url} alt={session.title || 'Foraging session'} />
            ))}
          </div>
        ) : null}
        </button>
        {expanded ? (
          <div className="forager-trail-item__expanded">
            <p className="muted">{session.notes || 'No notes'}</p>
            {species.length ? <p>Species: {species.join(', ')}</p> : <p>No species logged.</p>}
            <div className="forager-trail-item__actions">
              <Link className="secondary-btn" to={`/forager/${session.id}`}>
                Open Session
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
