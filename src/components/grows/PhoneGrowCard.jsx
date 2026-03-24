import { Link } from 'react-router-dom'
import { useEffect, useId, useState } from 'react'
import { useStore } from '../../store/store.jsx'
import { useAuth } from '../../store/auth.jsx'
import { uploadEntryPhotos } from '../../utils/photos.js'
import { uid } from '../../utils/id.js'
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
  return logs
    .filter((log) => log.growId === growId && log.growthMmPerDay != null)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-7)
    .map((log) => ({
      value: Number(log.growthMmPerDay),
      timestamp: log.timestamp,
      photos: Array.isArray(log.photos) ? log.photos : []
    }))
    .filter((item) => Number.isFinite(item.value))
}

function getStageLabels(phase) {
  switch (phase) {
    case 'Incubation':
      return ['Colonizing', 'Ready to fruit']
    case 'Pinning':
      return ['Primordia', 'Pinset']
    case 'Post-harvest':
      return ['Flush complete', 'Reset']
    case 'Fruiting':
    default:
      return ['Pinset', 'Harvest window']
  }
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
  const { user } = useAuth()
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

  const pointData = getChartPoints(logs, grow.id)
  const points = pointData.map((item) => item.value)
  const hasPoints = points.length > 0
  const width = 280
  const height = 150
  const padding = 16
  const max = hasPoints ? Math.max(...points) : 1
  const min = hasPoints ? Math.min(...points) : 0
  const range = max - min || 1
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0
  const coords = points.map((value, index) => {
    const x = points.length > 1 ? padding + index * step : width / 2
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return { x, y }
  })
  const singlePointGuide =
    points.length === 1 ? `M ${padding + 18} ${coords[0].y} L ${width - padding - 18} ${coords[0].y}` : ''
  const linePath =
    points.length > 1
      ? coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
      : ''
  const areaPath =
    points.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
      : ''
  const latestGrowth = points.length ? points[points.length - 1] : null
  const [stageStart, stageEnd] = getStageLabels(grow.phase)
  const latestGrowLog = logs
    .filter((log) => log.growId === grow.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]

  const [form, setForm] = useState({
    growthMmPerDay: '',
    temp: '',
    humidity: '',
    co2: '',
    notes: ''
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [activePointIndex, setActivePointIndex] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [lightboxZoomed, setLightboxZoomed] = useState(false)
  const chartPhotoPoints = pointData
    .map((item, index) => ({
      ...item,
      point: coords[index],
      photo: item.photos?.[0] || null,
      index
    }))
    .filter((item) => item.photo && item.point)
  const defaultPointIndex = chartPhotoPoints.length
    ? chartPhotoPoints[chartPhotoPoints.length - 1].index
    : pointData.length
      ? pointData.length - 1
      : null
  const activePoint = activePointIndex != null ? pointData[activePointIndex] : pointData[defaultPointIndex] || null
  const activeChartLabel = activePoint
    ? `${activePoint.value.toFixed(1)} mm/day`
    : latestGrowth != null
      ? `${latestGrowth.toFixed(1)} mm/day`
      : 'No logs'
  const activeChartDate = activePoint?.timestamp ? new Date(activePoint.timestamp).toLocaleDateString() : ''
  const activePhotoPoint = chartPhotoPoints.find((item) => item.index === activePointIndex) || null

  useEffect(() => {
    if (!pointData.length) {
      setActivePointIndex(null)
      return
    }
    if (activePointIndex == null || activePointIndex >= pointData.length) {
      setActivePointIndex(defaultPointIndex)
    }
  }, [pointData, activePointIndex, defaultPointIndex])

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('')
      return
    }
    const objectUrl = URL.createObjectURL(photoFile)
    setPhotoPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photoFile])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    const fallbackTemp =
      grow.targets?.tempMin != null && grow.targets?.tempMax != null
        ? Math.round(((grow.targets.tempMin + grow.targets.tempMax) / 2) * 10) / 10
        : latestGrowLog?.temp ?? null
    const fallbackHumidity =
      grow.targets?.humidityMin != null && grow.targets?.humidityMax != null
        ? Math.round((grow.targets.humidityMin + grow.targets.humidityMax) / 2)
        : latestGrowLog?.humidity ?? null
    const fallbackCo2 = grow.targets?.co2Max ?? latestGrowLog?.co2 ?? null
    try {
      const entryId = uid('log')
      const photos =
        user && photoFile
          ? await uploadEntryPhotos({
              userId: user.uid,
              entryType: 'logs',
              entryId,
              files: [photoFile]
            })
          : []
      await actions.addLog({
        id: entryId,
        growId: grow.id,
        timestamp: new Date().toISOString(),
        growthMmPerDay: form.growthMmPerDay === '' ? null : Number(form.growthMmPerDay),
        temp: form.temp === '' ? fallbackTemp : Number(form.temp),
        humidity: form.humidity === '' ? fallbackHumidity : Number(form.humidity),
        co2: form.co2 === '' ? fallbackCo2 : Number(form.co2),
        block: latestGrowLog?.block ?? null,
        treatment: latestGrowLog?.treatment ?? null,
        notes: form.notes,
        photos
      })
      setForm({
        growthMmPerDay: '',
        temp: '',
        humidity: '',
        co2: '',
        notes: ''
      })
      setPhotoFile(null)
    } catch (error) {
      console.error(error)
      setSubmitError('Photo upload failed. Try again.')
    } finally {
      setIsSubmitting(false)
    }
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

          <div
            className="phone-grow-card__chart"
            onMouseLeave={() => setActivePointIndex(defaultPointIndex)}
          >
            <div className="phone-grow-card__chart-blob" />
            <div className="phone-grow-card__chart-head">
              <div>
                <div className="phone-grow-card__chart-title">Radial Growth</div>
                <div className="phone-grow-card__chart-subtitle">mm from block over time</div>
              </div>
              <div className="phone-grow-card__chart-side">
                <div className="phone-grow-card__chart-value">
                  {activeChartLabel}
                  {activeChartDate ? <span className="phone-grow-card__chart-date">{activeChartDate}</span> : null}
                </div>
                {activePhotoPoint ? (
                  <button
                    className="phone-grow-card__chart-preview"
                    type="button"
                    onClick={() => {
                      setLightboxIndex(chartPhotoPoints.findIndex((entry) => entry.index === activePhotoPoint.index))
                      setLightboxZoomed(false)
                    }}
                    aria-label={`Open photo from ${new Date(activePhotoPoint.timestamp).toLocaleString()}`}
                  >
                    <img src={activePhotoPoint.photo.url} alt="Growth log preview" />
                  </button>
                ) : null}
              </div>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="phone-grow-card__chart-svg">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(130, 200, 225, 0.55)" />
                  <stop offset="100%" stopColor="rgba(130, 200, 225, 0)" />
                </linearGradient>
              </defs>
              <path className="phone-grow-card__chart-baseline" d={`M ${padding} ${height - padding} L ${width - padding} ${height - padding}`} />
              {singlePointGuide ? (
                <path className="phone-grow-card__chart-guide" d={singlePointGuide} />
              ) : null}
              {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
              {linePath ? <path d={linePath} stroke="#6f86a4" strokeWidth="2" fill="none" /> : null}
              {coords.map((point, index) => (
                <g key={`${point.x}-${index}`}>
                  {points.length === 1 ? (
                    <circle cx={point.x} cy={point.y} r="10" fill="rgba(94, 188, 203, 0.16)" />
                  ) : null}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={points.length === 1 ? '5.5' : '4'}
                    fill="#ffffff"
                    stroke="#6c7f99"
                    strokeWidth="1.4"
                    onMouseEnter={() => setActivePointIndex(index)}
                  />
                </g>
              ))}
            </svg>
            {!hasPoints ? (
              <div className="phone-grow-card__chart-empty">Add `mm from block` logs to see the flush develop</div>
            ) : null}
            <div className="phone-grow-card__chart-labels">
              <span>{stageStart}</span>
              <span>{stageEnd}</span>
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
                placeholder={
                  grow.targets?.tempMin != null && grow.targets?.tempMax != null
                    ? `${Math.round(((grow.targets.tempMin + grow.targets.tempMax) / 2) * 10) / 10}`
                    : '70'
                }
              />
            </label>
            <label>
              RH (%)
              <input
                type="number"
                step="1"
                value={form.humidity}
                onChange={(event) => setForm({ ...form, humidity: event.target.value })}
                placeholder={
                  grow.targets?.humidityMin != null && grow.targets?.humidityMax != null
                    ? `${Math.round((grow.targets.humidityMin + grow.targets.humidityMax) / 2)}`
                    : '90'
                }
              />
            </label>
            <label>
              CO2 (ppm)
              <input
                type="number"
                step="1"
                value={form.co2}
                onChange={(event) => setForm({ ...form, co2: event.target.value })}
                placeholder={grow.targets?.co2Max != null ? `${grow.targets.co2Max}` : '900'}
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
            <label className="full">
              Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
              />
            </label>
            {photoPreview ? (
              <div className="phone-grow-card__photo-preview">
                <img src={photoPreview} alt="Quick log preview" />
                <button
                  className="phone-grow-card__photo-remove"
                  type="button"
                  onClick={() => setPhotoFile(null)}
                >
                  Remove
                </button>
              </div>
            ) : null}
            {submitError ? <div className="phone-grow-card__form-error">{submitError}</div> : null}
            <button className="phone-grow-card__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Quick Log'}
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

      {lightboxIndex >= 0 && chartPhotoPoints[lightboxIndex] ? (
        <div
          className="phone-grow-card__lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setLightboxIndex(-1)
            setLightboxZoomed(false)
          }}
        >
          <button
            className="phone-grow-card__lightbox-close"
            type="button"
            onClick={() => {
              setLightboxIndex(-1)
              setLightboxZoomed(false)
            }}
          >
            Close
          </button>
          {chartPhotoPoints.length > 1 ? (
            <>
              <button
                className="phone-grow-card__lightbox-nav phone-grow-card__lightbox-nav--prev"
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setLightboxIndex((current) => (current <= 0 ? chartPhotoPoints.length - 1 : current - 1))
                  setLightboxZoomed(false)
                }}
              >
                Prev
              </button>
              <button
                className="phone-grow-card__lightbox-nav phone-grow-card__lightbox-nav--next"
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setLightboxIndex((current) =>
                    current >= chartPhotoPoints.length - 1 ? 0 : current + 1
                  )
                  setLightboxZoomed(false)
                }}
              >
                Next
              </button>
            </>
          ) : null}
          <button
            className="phone-grow-card__lightbox-zoom"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setLightboxZoomed((current) => !current)
            }}
          >
            {lightboxZoomed ? 'Fit' : 'Zoom'}
          </button>
          <div className="phone-grow-card__lightbox-card" onClick={(event) => event.stopPropagation()}>
            <div className={`phone-grow-card__lightbox-image-wrap ${lightboxZoomed ? 'is-zoomed' : ''}`}>
              <img
                src={chartPhotoPoints[lightboxIndex].photo.url}
                alt="Growth log full size"
                onClick={() => setLightboxZoomed((current) => !current)}
              />
            </div>
            <div className="phone-grow-card__lightbox-meta">
              {new Date(chartPhotoPoints[lightboxIndex].timestamp).toLocaleString()} ·{' '}
              {chartPhotoPoints[lightboxIndex].value.toFixed(1)} mm/day
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
