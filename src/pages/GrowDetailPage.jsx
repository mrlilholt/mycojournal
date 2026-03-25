import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import HealthBadge from '../components/grows/HealthBadge.jsx'
import LogFormModal from '../components/logs/LogFormModal.jsx'
import EventFormModal from '../components/events/EventFormModal.jsx'
import HarvestFormModal from '../components/harvests/HarvestFormModal.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Sparkline from '../components/ui/Sparkline.jsx'
import MultiLineChart from '../components/ui/MultiLineChart.jsx'
import TagPills from '../components/grows/TagPills.jsx'
import { formatDate, formatDateTime } from '../utils/date.js'
import { formatTemp } from '../utils/units.js'
import { exportGrowToCsv } from '../utils/export.js'
import { getEventsForGrow, getHarvestsForGrow, getLogsForGrow, getTimelineItems } from '../utils/data.js'
import {
  derivePhaseFromMeasurement,
  getHarvestRecommendation,
  getLatestMeasurementLog,
  getMeasuredFlushMm
} from '../utils/growthPhases.js'

const tabs = ['timeline', 'environment', 'harvests', 'notes']

function midpoint(min, max) {
  if (min == null || max == null) return null
  return (Number(min) + Number(max)) / 2
}

function getTimelineHighlights(item, units) {
  if (item.type === 'log') {
    return [
      item.payload.temp != null ? `Temp ${formatTemp(item.payload.temp, units)}` : null,
      item.payload.humidity != null ? `RH ${item.payload.humidity}%` : null,
      item.payload.co2 != null ? `CO2 ${item.payload.co2} ppm` : null,
      item.payload.growthMmPerDay != null ? `Growth ${item.payload.growthMmPerDay} mm/day` : null,
      item.payload.flushHeightMm != null ? `Flush ${item.payload.flushHeightMm} mm` : null,
      item.payload.block ? `Block ${item.payload.block}` : null,
      item.payload.treatment ? `Treatment ${item.payload.treatment}` : null
    ].filter(Boolean)
  }

  if (item.type === 'event') {
    return [
      item.payload.type ? `Event ${item.payload.type}` : null,
      item.payload.severity ? `Severity ${item.payload.severity}` : null
    ].filter(Boolean)
  }

  if (item.type === 'harvest') {
    return [
      item.payload.flushNumber != null ? `Flush ${item.payload.flushNumber}` : null,
      item.payload.weight != null ? `${item.payload.weight} lbs` : null,
      item.payload.quality ? `Quality ${item.payload.quality}` : null,
      item.payload.photos?.length ? `${item.payload.photos.length} photo${item.payload.photos.length > 1 ? 's' : ''}` : null
    ].filter(Boolean)
  }

  return []
}

export default function GrowDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, actions } = useStore()
  const [tab, setTab] = useState('environment')
  const [logOpen, setLogOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [harvestOpen, setHarvestOpen] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [editingHarvest, setEditingHarvest] = useState(null)
  const [notes, setNotes] = useState('')
  const [activeTimelineId, setActiveTimelineId] = useState('')

  const grow = state.grows.find((item) => item.id === id)

  const logs = useMemo(() => getLogsForGrow(state.logs, id), [state.logs, id])
  const events = useMemo(() => getEventsForGrow(state.events, id), [state.events, id])
  const harvests = useMemo(() => getHarvestsForGrow(state.harvests, id), [state.harvests, id])
  const timeline = useMemo(
    () => getTimelineItems({ logs: state.logs, events: state.events, harvests: state.harvests, growId: id }),
    [state.logs, state.events, state.harvests, id]
  )

  const avgTemp = useMemo(() => {
    if (!logs.length) return null
    const values = logs.map((log) => log.temp).filter((value) => value != null)
    if (!values.length) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [logs])

  const avgHumidity = useMemo(() => {
    if (!logs.length) return null
    const values = logs.map((log) => log.humidity).filter((value) => value != null)
    if (!values.length) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [logs])

  const sortedLogs = useMemo(
    () => logs.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [logs]
  )
  const reverseSortedLogs = useMemo(
    () => logs.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [logs]
  )

  const tempPoints = logs.map((log) => log.temp).filter((value) => value != null)
  const humidityPoints = logs.map((log) => log.humidity).filter((value) => value != null)
  const co2Points = logs.map((log) => log.co2).filter((value) => value != null)
  const growthPoints = logs.map((log) => log.growthMmPerDay).filter((value) => value != null)
  const flushPoints = logs.map((log) => log.flushHeightMm).filter((value) => value != null)

  const combinedSeries = useMemo(
    () => [
      {
        label: `Temp (°${state.settings.units})`,
        color: '#4a73c5',
        values: sortedLogs.map((log) => log.temp)
      },
      {
        label: 'Humidity (%)',
        color: '#5aa0c9',
        values: sortedLogs.map((log) => log.humidity)
      },
      {
        label: 'CO2 (ppm)',
        color: '#7a6bc8',
        values: sortedLogs.map((log) => log.co2)
      },
      {
        label: 'Growth (mm/day)',
        color: '#3a7ca5',
        values: sortedLogs.map((log) => log.growthMmPerDay)
      }
    ],
    [sortedLogs, state.settings.units]
  )

  const latestLog = useMemo(() => {
    if (!logs.length) return null
    return logs
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
  }, [logs])
  const latestMeasurementLog = useMemo(() => getLatestMeasurementLog(logs, grow?.id), [logs, grow?.id])
  const measuredMm = getMeasuredFlushMm(latestMeasurementLog)
  const preset = state.settings.presets?.[grow?.species] || null
  const displayPhase =
    derivePhaseFromMeasurement(measuredMm, grow?.phaseThresholds || preset?.phaseThresholds) || grow?.phase
  const harvestRecommendation = getHarvestRecommendation(
    grow?.species,
    measuredMm,
    {
      ...state.settings.harvestWindows,
      ...(preset?.harvestWindow ? { [grow?.species]: preset.harvestWindow } : {})
    }
  )

  const targetTemp = useMemo(
    () => midpoint(grow?.targets?.tempMin, grow?.targets?.tempMax),
    [grow?.targets?.tempMin, grow?.targets?.tempMax]
  )
  const targetHumidity = useMemo(
    () => midpoint(grow?.targets?.humidityMin, grow?.targets?.humidityMax),
    [grow?.targets?.humidityMin, grow?.targets?.humidityMax]
  )
  const targetCo2 = grow?.targets?.co2Max ?? null

  const tempDisplay = latestLog?.temp ?? targetTemp
  const humidityDisplay = latestLog?.humidity ?? targetHumidity
  const co2Display = latestLog?.co2 ?? targetCo2
  const blockDisplay = latestLog?.block ?? '—'
  const treatmentDisplay = latestLog?.treatment ?? '—'

  useEffect(() => {
    if (grow) setNotes(grow.notes || '')
  }, [grow])

  useEffect(() => {
    const expandDefault = state.settings.uiPreferences?.timelineExpandedDefault !== false
    setActiveTimelineId((current) => {
      if (timeline.some((item) => item.id === current)) return current
      return expandDefault ? timeline[0]?.id || '' : ''
    })
  }, [timeline, state.settings.uiPreferences?.timelineExpandedDefault])

  if (!grow) {
    return (
      <div className="page">
        <EmptyState
          title="Grow not found"
          description="This grow run no longer exists or the link is invalid."
          action={
            <Link className="secondary-btn" to="/grows">
              Back to Grows
            </Link>
          }
        />
      </div>
    )
  }

  const handleDelete = () => {
    const confirmed = window.confirm('Delete this grow run and all associated logs?')
    if (!confirmed) return
    actions.deleteGrow(grow.id)
    navigate('/grows')
  }

  const handleDuplicate = () => {
    actions.duplicateGrow(grow.id)
    navigate('/grows')
  }

  const handleExport = () => {
    exportGrowToCsv({ grow, logs, harvests })
  }

  const handleNotesSave = () => {
    actions.updateGrow(grow.id, { notes })
  }

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (row) => formatDateTime(row.timestamp)
    },
    {
      key: 'block',
      label: 'Block',
      render: (row) => row.block ?? '—'
    },
    {
      key: 'treatment',
      label: 'Treatment',
      render: (row) => row.treatment ?? '—'
    },
    {
      key: 'temp',
      label: `Temp (°${state.settings.units})`,
      render: (row) => (row.temp != null ? formatTemp(row.temp, state.settings.units) : '—')
    },
    {
      key: 'humidity',
      label: 'Humidity',
      render: (row) => (row.humidity != null ? `${row.humidity}%` : '—')
    },
    {
      key: 'co2',
      label: 'CO2',
      render: (row) => (row.co2 != null ? `${row.co2} ppm` : '—')
    },
    {
      key: 'growth',
      label: 'Growth (mm/day)',
      render: (row) => (row.growthMmPerDay != null ? row.growthMmPerDay : '—')
    },
    {
      key: 'flushHeight',
      label: 'Flush Height (mm)',
      render: (row) => (row.flushHeightMm != null ? row.flushHeightMm : '—')
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button className="ghost-btn table-action-btn" type="button" onClick={() => setEditingLog(row)}>
          Edit
        </button>
      )
    }
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{grow.name}</h1>
          <p className="muted">{grow.species} · {grow.method} · {displayPhase}</p>
          {harvestRecommendation ? <p className="muted">{harvestRecommendation.message}</p> : null}
          <TagPills tags={grow.tags} />
        </div>
        <div className="header-actions">
          <Link className="secondary-btn" to={`/new-grow?id=${grow.id}`}>
            Edit
          </Link>
          <button className="ghost-btn" type="button" onClick={handleDuplicate}>
            Duplicate
          </button>
          <button className="ghost-btn" type="button" onClick={handleExport}>
            Export CSV
          </button>
          <button className="ghost-btn" type="button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-top">
        <div className="detail-card">
          <div className="detail-row">
            <span className="label">Start Date</span>
            <span>{formatDate(grow.startDate)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Substrate</span>
            <span>{grow.substrate || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Targets</span>
            <span>
              {grow.targets?.tempMin != null ? formatTemp(grow.targets.tempMin, state.settings.units) : '—'} to{' '}
              {grow.targets?.tempMax != null ? formatTemp(grow.targets.tempMax, state.settings.units) : '—'},{' '}
              {grow.targets?.humidityMin != null ? `${grow.targets.humidityMin}%` : '—'} to{' '}
              {grow.targets?.humidityMax != null ? `${grow.targets.humidityMax}%` : '—'}
            </span>
          </div>
        </div>
        <HealthBadge grow={grow} logs={state.logs} events={state.events} settings={state.settings} />
      </div>

      <div className="tabs">
        {tabs.map((item) => (
          <button
            key={item}
            className={tab === item ? 'tab active' : 'tab'}
            type="button"
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
        <div className="tab-actions">
          <button className="secondary-btn" type="button" onClick={() => setLogOpen(true)}>
            Add Log
          </button>
          <button className="secondary-btn" type="button" onClick={() => setEventOpen(true)}>
            Add Event
          </button>
          <button className="secondary-btn" type="button" onClick={() => setHarvestOpen(true)}>
            Add Harvest
          </button>
        </div>
      </div>

      {tab === 'timeline' && (
        <div className="timeline">
          {timeline.length ? (
            timeline.map((item) => (
              <div
                key={item.id}
                className={`timeline-item ${activeTimelineId === item.id ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveTimelineId(item.id)}
                onFocus={() => setActiveTimelineId(item.id)}
              >
                <div className="timeline-rail">
                  <div className={`timeline-node timeline-node--${item.type}`} />
                </div>
                <button
                  className="timeline-card"
                  type="button"
                  onClick={() => setActiveTimelineId((current) => (current === item.id ? '' : item.id))}
                >
                  <div className="timeline-meta">
                    <span className="badge">{item.type}</span>
                    <span>{formatDateTime(item.timestamp)}</span>
                  </div>
                  <div className="timeline-highlights">
                    {getTimelineHighlights(item, state.settings.units).map((highlight) => (
                      <span key={highlight} className="timeline-pill">
                        {highlight}
                      </span>
                    ))}
                  </div>
                  {item.type === 'log' ? (
                    <div className="timeline-body">
                      <strong>
                        {item.payload.temp != null ? formatTemp(item.payload.temp, state.settings.units) : '—'} ·{' '}
                        {item.payload.humidity != null ? `${item.payload.humidity}%` : '—'} ·{' '}
                        {item.payload.co2 ?? '—'} ppm
                      </strong>
                      {(item.payload.block ||
                        item.payload.treatment ||
                        item.payload.growthMmPerDay != null ||
                        item.payload.flushHeightMm != null) && (
                        <div className="muted">
                          {item.payload.block ? `Block ${item.payload.block}` : 'Block —'} ·{' '}
                          {item.payload.treatment ? `Treatment ${item.payload.treatment}` : 'Treatment —'} ·{' '}
                          {item.payload.growthMmPerDay != null
                            ? `Growth ${item.payload.growthMmPerDay} mm/day`
                            : 'Growth —'} ·{' '}
                          {item.payload.flushHeightMm != null
                            ? `Flush ${item.payload.flushHeightMm} mm`
                            : 'Flush —'}
                        </div>
                      )}
                      <div className="muted">{item.payload.notes || 'No notes'}</div>
                      {item.payload.photos?.length ? (
                        <div className="timeline-photo-strip">
                          {item.payload.photos.map((photo) => (
                            <img key={photo.id || photo.url} src={photo.url} alt="Log entry" />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {item.type === 'event' ? (
                    <div className="timeline-body">
                      <strong>{item.payload.type}</strong>
                      <div className="muted">{item.payload.notes || 'No notes'}</div>
                    </div>
                  ) : null}
                  {item.type === 'harvest' ? (
                    <div className="timeline-body">
                      <strong>
                        Flush {item.payload.flushNumber} · {item.payload.weight ?? '—'} lbs
                      </strong>
                      <div className="muted">{item.payload.notes || 'No notes'}</div>
                      {item.payload.photos?.length ? (
                        <div className="timeline-photo-strip">
                          {item.payload.photos.map((photo) => (
                            <img key={photo.id || photo.url} src={photo.url} alt="Harvest entry" />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              title="No timeline entries"
              description="Add a log, event, or harvest to get started."
            />
          )}
        </div>
      )}

      {tab === 'environment' && (
        <div className="environment">
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="label">Temperature</span>
                <span className="metric-sub">
                  {latestLog?.temp != null ? 'Latest' : targetTemp != null ? 'Target midpoint' : 'Latest'}{' '}
                  {tempDisplay != null ? formatTemp(tempDisplay, state.settings.units) : '—'}
                </span>
              </div>
              <div className="metric-value">
                {avgTemp != null
                  ? formatTemp(avgTemp, state.settings.units)
                  : tempDisplay != null
                    ? formatTemp(tempDisplay, state.settings.units)
                    : '—'}
              </div>
              <span className="metric-caption">{avgTemp != null ? 'Average' : 'Current display'}</span>
              <Sparkline points={tempPoints} stroke="#4a73c5" height={64} />
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="label">Humidity</span>
                <span className="metric-sub">
                  {latestLog?.humidity != null ? 'Latest' : targetHumidity != null ? 'Target midpoint' : 'Latest'}{' '}
                  {humidityDisplay != null ? `${Math.round(humidityDisplay)}%` : '—'}
                </span>
              </div>
              <div className="metric-value">
                {avgHumidity != null
                  ? `${Math.round(avgHumidity)}%`
                  : humidityDisplay != null
                    ? `${Math.round(humidityDisplay)}%`
                    : '—'}
              </div>
              <span className="metric-caption">{avgHumidity != null ? 'Average' : 'Current display'}</span>
              <Sparkline points={humidityPoints} stroke="#5aa0c9" height={64} />
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="label">CO2</span>
                <span className="metric-sub">
                  {latestLog?.co2 != null ? 'Latest' : targetCo2 != null ? 'Target max' : 'Latest'}{' '}
                  {co2Display != null ? `${Math.round(co2Display)} ppm` : '—'}
                </span>
              </div>
              <div className="metric-value">
                {co2Points.length
                  ? `${Math.round(co2Points[co2Points.length - 1])} ppm`
                  : co2Display != null
                    ? `${Math.round(co2Display)} ppm`
                    : '—'}
              </div>
              <span className="metric-caption">{co2Points.length ? 'Last reading' : 'Current display'}</span>
              <Sparkline points={co2Points} stroke="#7a6bc8" height={64} />
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="label">Growth</span>
                <span className="metric-sub">
                  Latest {latestLog?.growthMmPerDay != null ? `${latestLog.growthMmPerDay} mm/day` : '—'}
                </span>
              </div>
              <div className="metric-value">
                {growthPoints.length ? `${growthPoints[growthPoints.length - 1]} mm/day` : '—'}
              </div>
              <span className="metric-caption">Last reading</span>
              <Sparkline points={growthPoints} stroke="#4a8aa6" height={64} />
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="label">Block</span>
                <span className="metric-sub">Latest log</span>
              </div>
              <div className="metric-value metric-value--text">{blockDisplay}</div>
              <span className="metric-caption">Copied forward on quick log</span>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="label">Treatment</span>
                <span className="metric-sub">Latest log</span>
              </div>
              <div className="metric-value metric-value--text">{treatmentDisplay}</div>
              <span className="metric-caption">Copied forward on quick log</span>
            </div>
          </div>
          <div className="panel">
            <h3>Combined Trends</h3>
            <MultiLineChart series={combinedSeries} height={200} />
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="label">Avg Temp</span>
              <strong>{avgTemp != null ? formatTemp(avgTemp, state.settings.units) : '—'}</strong>
            </div>
            <div className="stat-card">
              <span className="label">Avg Humidity</span>
              <strong>{avgHumidity != null ? `${Math.round(avgHumidity)}%` : '—'}</strong>
            </div>
            <div className="stat-card">
              <span className="label">Logs</span>
              <strong>{logs.length}</strong>
            </div>
          </div>
          <div className="chart-panel">
            <div>
              <h3>Temperature</h3>
              <Sparkline points={tempPoints} stroke="#2d6a4f" />
            </div>
            <div>
              <h3>Humidity</h3>
              <Sparkline points={humidityPoints} stroke="#1b4965" />
            </div>
            <div>
              <h3>CO2</h3>
              <Sparkline points={co2Points} stroke="#6a4c93" />
            </div>
            <div>
              <h3>Growth (mm/day)</h3>
              <Sparkline points={growthPoints} stroke="#3a7ca5" />
            </div>
            <div>
              <h3>Flush Height (mm)</h3>
              <Sparkline points={flushPoints} stroke="#6c8ea4" />
            </div>
          </div>
          <DataTable columns={columns} rows={reverseSortedLogs} />
        </div>
      )}

      {tab === 'harvests' && (
        <div className="harvests">
          {harvests.length ? (
            <div className="harvest-list">
              {harvests.map((harvest) => (
                <div key={harvest.id} className="harvest-card">
                  <div>
                    <h3>Flush {harvest.flushNumber}</h3>
                    <p className="muted">{formatDate(harvest.date)}</p>
                  </div>
                  <div>
                    <strong>{harvest.weight ?? '—'} lbs</strong>
                    <p className="muted">Quality {harvest.quality ?? '—'}</p>
                  </div>
                  <p className="muted">{harvest.notes || 'No notes'}</p>
                  {harvest.photos?.length ? (
                    <div className="timeline-photo-strip">
                      {harvest.photos.map((photo) => (
                        <img key={photo.id || photo.url} src={photo.url} alt="Harvest" />
                      ))}
                    </div>
                  ) : null}
                  <button
                    className="ghost-btn table-action-btn"
                    type="button"
                    onClick={() => setEditingHarvest(harvest)}
                  >
                    Edit Harvest
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No harvests yet"
              description="Track each flush weight and quality for this grow run."
            />
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="notes-panel">
          <textarea
            rows="8"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add observations, lessons, or reminders..."
          />
          <button className="primary-btn" type="button" onClick={handleNotesSave}>
            Save Notes
          </button>
        </div>
      )}

      <LogFormModal
        open={logOpen || Boolean(editingLog)}
        onClose={() => {
          setLogOpen(false)
          setEditingLog(null)
        }}
        growId={grow.id}
        growOptions={state.grows}
        initialLog={editingLog}
      />
      <EventFormModal open={eventOpen} onClose={() => setEventOpen(false)} growId={grow.id} />
      <HarvestFormModal
        open={harvestOpen || Boolean(editingHarvest)}
        onClose={() => {
          setHarvestOpen(false)
          setEditingHarvest(null)
        }}
        growId={grow.id}
        initialHarvest={editingHarvest}
      />
    </div>
  )
}
