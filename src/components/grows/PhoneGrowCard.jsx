import { Link } from 'react-router-dom'
import { useEffect, useId, useState } from 'react'
import { useStore } from '../../store/store.jsx'
import './PhoneGrowCard.css'

function weeksSinceStart(startDate) {
  if (!startDate) return 1
  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return 1
  const diff = Date.now() - start.getTime()
  const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) + 1
  return Math.max(1, weeks)
}

function ordinal(n) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const mod10 = n % 10
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}

function getChartPoints(logs = [], growId) {
  const series = logs
    .filter((log) => log.growId === growId && log.growthMmPerDay != null)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-7)
    .map((log) => Number(log.growthMmPerDay))

  return series.filter((value) => Number.isFinite(value))
}

const imageMap = {
  "Hericium erinaceus (Lion's Mane)": '/lionsmane.png',
  'Pleurotus ostreatus (Blue Oyster)': '/blueoyster.png',
  'Pleurotus ostreatus (Snow Oyster)': '/snowoyster.png',
  'Pleurotus citrinolileatus (Golden Oyster)': '/goldenoyster.png',
  'Pleurotus djamor (Pink Oyster)': '/pinkoyster.png',
  'Pleurotus pulmonarius (Italian Oyster)': '/italianOyster.png',
  'Pholiota adiposa (Chestnut)': '/chestnut.png',
  'Lentinula edodes (Shiitake)': '/shiitake.png',
  'King Trumpet (Pleurotus eryngii)': ['/kingTrumpet.png', '/kingOyster.png']
}

function useMediaQuery(query) {
  const getMatch = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false)
  const [matches, setMatches] = useState(getMatch)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia(query)
    const handler = (event) => setMatches(event.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [query])

  return matches
}

export default function PhoneGrowCard({ grow, logs, onQuickLog }) {
  const { actions } = useStore()
  const isMobile = useMediaQuery('(max-width: 900px)')
  const [expanded, setExpanded] = useState(!isMobile)
  const gradientId = useId()
  const ringGradientId = useId()
  const dottedId = useId()
  const formId = `quick-log-${grow.id}`
  const weeks = weeksSinceStart(grow.startDate)
  const ordinalWeek = ordinal(weeks)
  const progress = Math.min(1, weeks / 12)
  const radius = 88
  const stroke = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  const points = getChartPoints(logs, grow.id)
  const hasPoints = points.length > 0
  const width = 280
  const height = 150
  const padding = 16
  const max = hasPoints ? Math.max(...points) : 1
  const min = hasPoints ? Math.min(...points) : 0
  const range = max - min || 1
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0
  const coords = points.map((value, index) => {
    const x = padding + index * step
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return { x, y }
  })
  const linePath =
    points.length > 1
      ? coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
      : ''
  const areaPath =
    points.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
      : ''
  const badgePoint = coords[Math.floor(coords.length / 2)] || { x: padding, y: padding }

  const [form, setForm] = useState({
    growthMmPerDay: '',
    temp: '',
    humidity: '',
    co2: '',
    notes: ''
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    actions.addLog({
      growId: grow.id,
      timestamp: new Date().toISOString(),
      growthMmPerDay: form.growthMmPerDay === '' ? null : Number(form.growthMmPerDay),
      temp: form.temp === '' ? null : Number(form.temp),
      humidity: form.humidity === '' ? null : Number(form.humidity),
      co2: form.co2 === '' ? null : Number(form.co2),
      notes: form.notes
    })
    setForm({
      growthMmPerDay: '',
      temp: '',
      humidity: '',
      co2: '',
      notes: ''
    })
  }

  const match = grow.species ? grow.species.match(/\(([^)]+)\)/) : null
  const parenName = match ? match[1] : ''
  const prefixName = grow.species ? grow.species.split('(')[0].trim() : ''
  const speciesKey = grow.species ? grow.species.toLowerCase().replace(/[^a-z0-9]+/g, '') : ''
  const prefixKey = prefixName ? prefixName.toLowerCase().replace(/[^a-z0-9]+/g, '') : ''
  const parenKey = parenName ? parenName.toLowerCase().replace(/[^a-z0-9]+/g, '') : ''
  const mapped = imageMap[grow.species]
  const mappedList = Array.isArray(mapped) ? mapped : mapped ? [mapped] : []
  const imageCandidates = [
    ...mappedList,
    parenKey ? `/${parenKey}.png` : '',
    prefixKey ? `/${prefixKey}.png` : '',
    speciesKey ? `/${speciesKey}.png` : ''
  ].filter(Boolean)
  const [imageIndex, setImageIndex] = useState(0)
  const imageSrc = imageCandidates[imageIndex]

  useEffect(() => {
    if (isMobile) {
      setExpanded(false)
    } else {
      setExpanded(true)
    }
  }, [isMobile])

  return (
    <div className={`phone-grow-card ${isMobile && !expanded ? 'phone-grow-card--collapsed' : ''}`}>
      <div className="phone-grow-card__vignette" />
      <div className="phone-grow-card__nav">
        <div className="phone-grow-card__chevron">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </div>
        <div>
          <div className="phone-grow-card__title">{grow.name}</div>
          <div className="phone-grow-card__subtitle">
            {grow.species} • {grow.method} • {grow.phase}
          </div>
        </div>
        <Link to={`/grows/${grow.id}`} className="phone-grow-card__action" aria-label="Open grow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 17l6-6 4 4 6-6" />
          </svg>
        </Link>
      </div>

      {isMobile ? (
        <button
          className="phone-grow-card__toggle"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      ) : null}

      <div className={`phone-grow-card__body ${isMobile && !expanded ? 'is-collapsed' : ''}`}>
        <div className="phone-grow-card__left">
          <div className="phone-grow-card__ring">
            <svg width="220" height="220" viewBox="0 0 220 220">
              <defs>
                <linearGradient id={ringGradientId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#e3efff" />
                  <stop offset="100%" stopColor="#a7c3f2" />
                </linearGradient>
                <linearGradient id={dottedId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#cddbf1" />
                  <stop offset="100%" stopColor="#a9bcd8" />
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
                stroke={`url(#${ringGradientId})`}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 110 110)"
              />
              {[...Array(10)].map((_, index) => {
                const angle = (-110 + index * 6) * (Math.PI / 180)
                const r = radius - 12
                const cx = 110 + r * Math.cos(angle)
                const cy = 110 + r * Math.sin(angle)
                return <circle key={index} cx={cx} cy={cy} r="1.5" fill={`url(#${dottedId})`} />
              })}
            </svg>
            <div className="phone-grow-card__ring-text">
              <div className="phone-grow-card__ring-week">{ordinalWeek}</div>
              <div className="phone-grow-card__ring-label">week</div>
            </div>
          </div>

          <div className="phone-grow-card__row">
            <div className="phone-grow-card__row-title">Growing</div>
            <button
              className="phone-grow-card__update"
              type="button"
              onClick={() => (onQuickLog ? onQuickLog(grow.id) : null)}
            >
              Update data
            </button>
          </div>

          <div className="phone-grow-card__chart">
            <div className="phone-grow-card__chart-blob" />
            <svg viewBox={`0 0 ${width} ${height}`} className="phone-grow-card__chart-svg">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(130, 200, 225, 0.55)" />
                  <stop offset="100%" stopColor="rgba(130, 200, 225, 0)" />
                </linearGradient>
              </defs>
              {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
              {linePath ? <path d={linePath} stroke="#6f86a4" strokeWidth="2" fill="none" /> : null}
              {coords.map((point, index) => (
                <circle
                  key={`${point.x}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#6c7f99"
                  strokeWidth="1.4"
                />
              ))}
              {coords.length > 1 ? (
                <g transform={`translate(${badgePoint.x - 12}, ${badgePoint.y - 28})`}>
                  <rect width="24" height="24" rx="8" fill="rgba(255,255,255,0.9)" />
                  <path
                    d="M7 11h10v6H7z"
                    fill="none"
                    stroke="#6c7f99"
                    strokeWidth="1.4"
                  />
                  <circle cx="12" cy="14" r="2" fill="none" stroke="#6c7f99" strokeWidth="1.2" />
                  <path d="M9 9h6" stroke="#6c7f99" strokeWidth="1.4" />
                </g>
              ) : null}
            </svg>
            {!hasPoints ? (
              <div className="phone-grow-card__chart-empty">Add growth logs to see trend</div>
            ) : null}
            <div className="phone-grow-card__chart-labels">
              <span>Vegetative</span>
              <span>Pre-flowering</span>
            </div>
          </div>
        </div>

        <div className="phone-grow-card__right">
          <div className="phone-grow-card__image">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={grow.species}
                onError={() => setImageIndex((value) => value + 1)}
              />
            ) : null}
          </div>
          <form id={formId} className="phone-grow-card__form" onSubmit={handleSubmit}>
            <label>
              mm from block
              <input
                type="number"
                step="0.1"
                value={form.growthMmPerDay}
                onChange={(event) => setForm({ ...form, growthMmPerDay: event.target.value })}
                placeholder="0.6"
              />
            </label>
            <label>
              Temp (°F)
              <input
                type="number"
                step="0.1"
                value={form.temp}
                onChange={(event) => setForm({ ...form, temp: event.target.value })}
                placeholder="70"
              />
            </label>
            <label>
              RH (%)
              <input
                type="number"
                step="1"
                value={form.humidity}
                onChange={(event) => setForm({ ...form, humidity: event.target.value })}
                placeholder="90"
              />
            </label>
            <label>
              CO2 (ppm)
              <input
                type="number"
                step="1"
                value={form.co2}
                onChange={(event) => setForm({ ...form, co2: event.target.value })}
                placeholder="900"
              />
            </label>
            <label className="full">
              Notes
              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Observations..."
              />
            </label>
            <button className="phone-grow-card__submit" type="submit">
              Quick Log
            </button>
          </form>
          {grow.status !== 'complete' ? (
            <button
              className="phone-grow-card__harvest"
              type="button"
              onClick={() => actions.completeGrow(grow.id)}
            >
              Mark Harvested
            </button>
          ) : (
            <button
              className="phone-grow-card__unarchive"
              type="button"
              onClick={() => actions.unarchiveGrow(grow.id)}
            >
              Unarchive
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
