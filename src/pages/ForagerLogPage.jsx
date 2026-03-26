import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import ForagingSessionCard from '../components/forager/ForagingSessionCard.jsx'
import ForagingSessionForm from '../components/forager/ForagingSessionForm.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useStore } from '../store/store.jsx'
import { getFindsForSession } from '../utils/foragerData.js'
import { fuzzyMatchesFind, fuzzyMatchesSession } from '../utils/search.js'

const dateRanges = [
  { value: 'all', label: 'All dates' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' }
]

export default function ForagerLogPage() {
  const { state } = useStore()
  const { searchQuery = '' } = useOutletContext()
  const navigate = useNavigate()
  const [filter, setFilter] = useState({ outcome: 'all', species: 'all', range: 'all' })
  const [expandedId, setExpandedId] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const speciesOptions = useMemo(
    () =>
      Array.from(
        new Set(
          state.foragingFinds
            .map((find) => find.species?.commonName || find.species?.latinName)
            .filter(Boolean)
        )
      ).sort(),
    [state.foragingFinds]
  )

  const filteredSessions = useMemo(() => {
    const now = Date.now()
    return state.foragingSessions
      .filter((session) => {
        const finds = getFindsForSession(state.foragingFinds, session.id)
        if (filter.outcome === 'finds' && session.outcome !== 'finds') return false
        if (filter.outcome === 'no-finds' && session.outcome !== 'no-finds') return false
        if (
          filter.species !== 'all' &&
          !finds.some((find) => (find.species?.commonName || find.species?.latinName) === filter.species)
        ) {
          return false
        }
        if (filter.range !== 'all') {
          const ageMs = now - new Date(session.startedAt).getTime()
          const maxMs = Number(filter.range) * 24 * 60 * 60 * 1000
          if (ageMs > maxMs) return false
        }
        if (
          searchQuery &&
          !fuzzyMatchesSession(session, searchQuery) &&
          !finds.some((find) => fuzzyMatchesFind(find, searchQuery))
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  }, [state.foragingSessions, state.foragingFinds, filter, searchQuery])

  const summary = useMemo(() => {
    const sessions = state.foragingSessions || []
    const species = new Set(
      state.foragingFinds
        .map((find) => find.species?.latinName || find.species?.commonName)
        .filter(Boolean)
    )
    return {
      total: sessions.length,
      withFinds: sessions.filter((session) => session.outcome === 'finds').length,
      noFinds: sessions.filter((session) => session.outcome === 'no-finds').length,
      speciesCount: species.size
    }
  }, [state.foragingSessions, state.foragingFinds])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Forager Log</h1>
          <p className="muted">Track wild foraging sessions, exact finds, weather, and field notes.</p>
        </div>
        <button className="primary-btn" type="button" onClick={() => setFormOpen(true)}>
          + New Session
        </button>
      </div>

      <div className="forager-summary-grid">
        <div className="panel"><span className="label">Sessions</span><strong>{summary.total}</strong></div>
        <div className="panel"><span className="label">With Finds</span><strong>{summary.withFinds}</strong></div>
        <div className="panel"><span className="label">No-Find Hikes</span><strong>{summary.noFinds}</strong></div>
        <div className="panel"><span className="label">Species Seen</span><strong>{summary.speciesCount}</strong></div>
      </div>

      <div className="filters-bar">
        <select value={filter.outcome} onChange={(event) => setFilter((current) => ({ ...current, outcome: event.target.value }))}>
          <option value="all">All sessions</option>
          <option value="finds">With finds</option>
          <option value="no-finds">No finds</option>
        </select>
        <select value={filter.species} onChange={(event) => setFilter((current) => ({ ...current, species: event.target.value }))}>
          <option value="all">All species</option>
          {speciesOptions.map((species) => (
            <option key={species} value={species}>
              {species}
            </option>
          ))}
        </select>
        <select value={filter.range} onChange={(event) => setFilter((current) => ({ ...current, range: event.target.value }))}>
          {dateRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {filteredSessions.length ? (
        <div className="forager-trail">
          {filteredSessions.map((session) => (
            <ForagingSessionCard
              key={session.id}
              session={session}
              finds={getFindsForSession(state.foragingFinds, session.id)}
              expanded={expandedId === session.id}
              onToggle={() => setExpandedId((current) => (current === session.id ? '' : session.id))}
              showExact={state.settings.foragerPreferences?.showExactCoordsInOverview}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No foraging sessions yet"
          description="Start a new session to log weather, location, finds, and photos."
          action={
            <button className="secondary-btn" type="button" onClick={() => setFormOpen(true)}>
              Create Session
            </button>
          }
        />
      )}

      <ForagingSessionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(sessionId) => navigate(`/forager/${sessionId}`)}
      />
    </div>
  )
}
