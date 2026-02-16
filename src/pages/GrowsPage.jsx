import { useMemo, useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import PhoneGrowCard from '../components/grows/PhoneGrowCard.jsx'
import FiltersBar from '../components/grows/FiltersBar.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useStore } from '../store/store.jsx'

const phaseOptions = ['Incubation', 'Pinning', 'Fruiting', 'Post-harvest']

export default function GrowsPage() {
  const { state } = useStore()
  const { searchQuery, openQuickLog } = useOutletContext()
  const [filters, setFilters] = useState({
    status: 'all',
    species: 'all',
    phase: 'all',
    tag: 'all'
  })

  const speciesOptions = useMemo(
    () => Array.from(new Set(state.grows.map((grow) => grow.species))).sort(),
    [state.grows]
  )

  const tagOptions = useMemo(
    () => Array.from(new Set(state.grows.flatMap((grow) => grow.tags))).sort(),
    [state.grows]
  )

  const filtered = useMemo(() => {
    return state.grows.filter((grow) => {
      if (filters.status !== 'all' && grow.status !== filters.status) return false
      if (filters.species !== 'all' && grow.species !== filters.species) return false
      if (filters.phase !== 'all' && grow.phase !== filters.phase) return false
      if (filters.tag !== 'all' && !grow.tags.includes(filters.tag)) return false
      if (searchQuery) {
        const haystack = `${grow.name} ${grow.species} ${grow.tags.join(' ')}`.toLowerCase()
        if (!haystack.includes(searchQuery.toLowerCase())) return false
      }
      return true
    })
  }, [state.grows, filters, searchQuery])

  const activeGrows = filtered.filter((grow) => grow.status === 'active')
  const completedGrows = filtered.filter((grow) => grow.status === 'complete')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <img className="page-title-image" src="/GROWRuns.svg" alt="Grow Runs" />
          <p className="muted">Track each run, log readings, and spot trends fast.</p>
        </div>
        <Link className="primary-btn" to="/new-grow">
          + New Grow
        </Link>
      </div>

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        speciesOptions={speciesOptions}
        tagOptions={tagOptions}
        phaseOptions={phaseOptions}
      />

      <section className="section">
        <h2>Active</h2>
        {activeGrows.length ? (
          <div className="phone-card-grid">
            {activeGrows.map((grow) => (
              <PhoneGrowCard
                key={grow.id}
                grow={grow}
                logs={state.logs}
                onQuickLog={openQuickLog}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active grows"
            description="Start a new grow run or adjust filters to see active grows."
            action={
              <Link className="secondary-btn" to="/new-grow">
                Create Grow Run
              </Link>
            }
          />
        )}
      </section>

      <section className="section">
        <h2>Completed</h2>
        {completedGrows.length ? (
          <div className="phone-card-grid">
            {completedGrows.map((grow) => (
              <PhoneGrowCard
                key={grow.id}
                grow={grow}
                logs={state.logs}
                onQuickLog={openQuickLog}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No completed grows"
            description="Finish a run to see it archived here for reference."
          />
        )}
      </section>
    </div>
  )
}
