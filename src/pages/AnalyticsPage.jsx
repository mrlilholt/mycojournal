import { useMemo } from 'react'
import { useStore } from '../store/store.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { formatTemp } from '../utils/units.js'
import { formatDate } from '../utils/date.js'

export default function AnalyticsPage() {
  const { state } = useStore()

  const harvestBySpecies = useMemo(() => {
    const totals = {}
    state.harvests.forEach((harvest) => {
      const grow = state.grows.find((item) => item.id === harvest.growId)
      if (!grow) return
      const key = grow.species
      totals[key] = (totals[key] || 0) + (harvest.weight || 0)
    })
    return Object.entries(totals).map(([species, weight]) => ({ species, weight }))
  }, [state.harvests, state.grows])

  const avgByGrow = useMemo(() => {
    return state.grows.map((grow) => {
      const logs = state.logs.filter((log) => log.growId === grow.id)
      const temps = logs.map((log) => log.temp).filter((value) => value != null)
      const humidity = logs.map((log) => log.humidity).filter((value) => value != null)
      const avgTemp = temps.length ? temps.reduce((sum, value) => sum + value, 0) / temps.length : null
      const avgHumidity = humidity.length
        ? humidity.reduce((sum, value) => sum + value, 0) / humidity.length
        : null
      return { grow, avgTemp, avgHumidity }
    })
  }, [state.grows, state.logs])

  const contaminationRate = useMemo(() => {
    if (!state.grows.length) return 0
    const contaminated = new Set(
      state.events.filter((event) => event.type === 'contam').map((event) => event.growId)
    )
    return Math.round((contaminated.size / state.grows.length) * 100)
  }, [state.events, state.grows])

  const currentVsHarvest = useMemo(() => {
    const active = state.grows.filter((grow) => grow.status === 'active')
    const latestHarvest = state.harvests
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    const latestGrow = latestHarvest
      ? state.grows.find((grow) => grow.id === latestHarvest.growId)
      : null
    return {
      activeCount: active.length,
      latestHarvest,
      latestGrow
    }
  }, [state.grows, state.harvests])

  const speciesBreakdown = useMemo(() => {
    const growSpecies = new Map(state.grows.map((grow) => [grow.id, grow.species]))
    const summary = {}

    state.logs.forEach((log) => {
      const species = growSpecies.get(log.growId)
      if (!species) return
      if (!summary[species]) {
        summary[species] = {
          species,
          logCount: 0,
          growthValues: [],
          harvestWeight: 0
        }
      }
      summary[species].logCount += 1
      if (log.growthMmPerDay != null) {
        summary[species].growthValues.push(Number(log.growthMmPerDay))
      }
    })

    state.harvests.forEach((harvest) => {
      const species = growSpecies.get(harvest.growId)
      if (!species) return
      if (!summary[species]) {
        summary[species] = {
          species,
          logCount: 0,
          growthValues: [],
          harvestWeight: 0
        }
      }
      summary[species].harvestWeight += harvest.weight || 0
    })

    return Object.values(summary).map((item) => {
      const avgGrowth = item.growthValues.length
        ? item.growthValues.reduce((sum, value) => sum + value, 0) / item.growthValues.length
        : null
      return { ...item, avgGrowth }
    })
  }, [state.grows, state.logs, state.harvests])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <img className="page-title-image" src="/analytics.svg" alt="Analytics" />
          <p className="muted">Quick snapshots from your logs and harvests.</p>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="panel">
          <h3>Current vs Previous Harvest</h3>
          <div className="avg-list">
            <div className="avg-row">
              <div>
                <strong>Active Grows</strong>
                <div className="muted">Currently running</div>
              </div>
              <div>
                <span className="label">Count</span>
                <strong>{currentVsHarvest.activeCount}</strong>
              </div>
              <div />
            </div>
            <div className="avg-row">
              <div>
                <strong>Latest Harvest</strong>
                <div className="muted">
                  {currentVsHarvest.latestGrow ? currentVsHarvest.latestGrow.species : 'No harvests yet'}
                </div>
              </div>
              <div>
                <span className="label">Weight</span>
                <strong>
                  {currentVsHarvest.latestHarvest?.weight != null
                    ? `${currentVsHarvest.latestHarvest.weight} lbs`
                    : '—'}
                </strong>
              </div>
              <div>
                <span className="label">Date</span>
                <strong>
                  {currentVsHarvest.latestHarvest?.date ? formatDate(currentVsHarvest.latestHarvest.date) : '—'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Species Breakdown (Historical)</h3>
          {speciesBreakdown.length ? (
            <div className="avg-list">
              {speciesBreakdown.map((item) => (
                <div key={item.species} className="avg-row">
                  <div>
                    <strong>{item.species}</strong>
                    <div className="muted">{item.logCount} logs</div>
                  </div>
                  <div>
                    <span className="label">Avg Growth</span>
                    <strong>{item.avgGrowth != null ? `${item.avgGrowth.toFixed(2)} mm/day` : '—'}</strong>
                  </div>
                  <div>
                    <span className="label">Harvest</span>
                    <strong>{item.harvestWeight ? `${item.harvestWeight.toFixed(1)} lbs` : '—'}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No species stats yet"
              description="Log growth and harvests to see species breakdowns."
            />
          )}
        </div>

        <div className="panel">
          <h3>Total Harvest Weight by Species</h3>
          {harvestBySpecies.length ? (
            <div className="bar-list">
              {harvestBySpecies.map((item) => (
                <div key={item.species} className="bar-row">
                  <div className="bar-label">{item.species}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.min(item.weight * 30, 100)}%` }} />
                  </div>
                  <div className="bar-value">{item.weight.toFixed(1)} lbs</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No harvest data yet"
              description="Log a harvest to start tracking yields by species."
            />
          )}
        </div>

        <div className="panel">
          <h3>Avg Temp / Humidity by Grow</h3>
          {avgByGrow.length ? (
            <div className="avg-list">
              {avgByGrow.map((item) => (
                <div key={item.grow.id} className="avg-row">
                  <div>
                    <strong>{item.grow.name}</strong>
                    <div className="muted">{item.grow.species}</div>
                  </div>
                  <div>
                    <span className="label">Temp</span>
                    <strong>
                      {item.avgTemp != null ? formatTemp(item.avgTemp, state.settings.units) : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="label">Humidity</span>
                    <strong>{item.avgHumidity != null ? `${Math.round(item.avgHumidity)}%` : '—'}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No logs yet"
              description="Add environment logs to see averages here."
            />
          )}
        </div>

        <div className="panel">
          <h3>Contamination Rate</h3>
          <div className="contam-rate">
            <div className="contam-meter">
              <div className="contam-fill" style={{ width: `${contaminationRate}%` }} />
            </div>
            <div>
              <strong>{contaminationRate}%</strong>
              <p className="muted">Grows with contam events logged.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
