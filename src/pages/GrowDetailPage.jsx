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
import TagPills from '../components/grows/TagPills.jsx'
import { formatDate, formatDateTime } from '../utils/date.js'
import { formatTemp } from '../utils/units.js'
import { exportGrowToCsv } from '../utils/export.js'
import { getEventsForGrow, getHarvestsForGrow, getLogsForGrow, getTimelineItems } from '../utils/data.js'

const tabs = ['timeline', 'environment', 'harvests', 'notes']

export default function GrowDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, actions } = useStore()
  const [tab, setTab] = useState('timeline')
  const [logOpen, setLogOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [harvestOpen, setHarvestOpen] = useState(false)
  const [notes, setNotes] = useState('')

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

  const tempPoints = logs.map((log) => log.temp).filter((value) => value != null)
  const humidityPoints = logs.map((log) => log.humidity).filter((value) => value != null)

  useEffect(() => {
    if (grow) setNotes(grow.notes || '')
  }, [grow])

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
      key: 'surface',
      label: 'Surface',
      render: (row) => row.surfaceCondition ?? '—'
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
    }
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{grow.name}</h1>
          <p className="muted">{grow.species} · {grow.method} · {grow.phase}</p>
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
              <div key={item.id} className="timeline-item">
                <div className="timeline-meta">
                  <span className="badge">{item.type}</span>
                  <span>{formatDateTime(item.timestamp)}</span>
                </div>
                <div className="timeline-body">
                  {item.type === 'log' ? (
                    <div>
                      <strong>
                        {formatTemp(item.payload.temp, state.settings.units)} ·{' '}
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
                    </div>
                  ) : null}
                  {item.type === 'event' ? (
                    <div>
                      <strong>{item.payload.type}</strong>
                      <div className="muted">{item.payload.notes || 'No notes'}</div>
                    </div>
                  ) : null}
                  {item.type === 'harvest' ? (
                    <div>
                      <strong>
                        Flush {item.payload.flushNumber} · {item.payload.weight ?? '—'} lbs
                      </strong>
                      <div className="muted">{item.payload.notes || 'No notes'}</div>
                    </div>
                  ) : null}
                </div>
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
          </div>
          <DataTable columns={columns} rows={logs} />
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
        open={logOpen}
        onClose={() => setLogOpen(false)}
        growId={grow.id}
        growOptions={state.grows}
      />
      <EventFormModal open={eventOpen} onClose={() => setEventOpen(false)} growId={grow.id} />
      <HarvestFormModal
        open={harvestOpen}
        onClose={() => setHarvestOpen(false)}
        growId={grow.id}
      />
    </div>
  )
}
