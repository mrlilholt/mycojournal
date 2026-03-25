import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import PhoneGrowCard from '../components/grows/PhoneGrowCard.jsx'
import FiltersBar from '../components/grows/FiltersBar.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useStore } from '../store/store.jsx'
import { fuzzyMatchesGrow } from '../utils/search.js'

const phaseOptions = ['Incubation', 'Pinning', 'Early Growth', 'Fruiting', 'Mature Growth', 'Post-harvest']

export default function HarvestPage() {
  const { state } = useStore()
  const { searchQuery, openQuickLog } = useOutletContext()
  const [filters, setFilters] = useState({
    status: 'complete',
    species: 'all',
    phase: 'all',
    tag: 'all'
  })

  const speciesOptions = useMemo(
    () => Array.from(new Set(state.grows.filter((grow) => grow.status === 'complete').map((grow) => grow.species))).sort(),
    [state.grows]
  )

  const tagOptions = useMemo(
    () => Array.from(new Set(state.grows.filter((grow) => grow.status === 'complete').flatMap((grow) => grow.tags))).sort(),
    [state.grows]
  )

  const harvestedGrows = useMemo(() => {
    return state.grows.filter((grow) => {
      if (grow.status !== 'complete') return false
      if (filters.species !== 'all' && grow.species !== filters.species) return false
      if (filters.phase !== 'all' && grow.phase !== filters.phase) return false
      if (filters.tag !== 'all' && !grow.tags.includes(filters.tag)) return false
      if (searchQuery && !fuzzyMatchesGrow(grow, searchQuery)) return false
      return true
    })
  }, [state.grows, filters, searchQuery])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Harvest Archive</h1>
          <p className="muted">Review completed blocks, compare flushes, and reopen archived grows when needed.</p>
        </div>
      </div>

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        speciesOptions={speciesOptions}
        tagOptions={tagOptions}
        phaseOptions={phaseOptions}
      />

      {harvestedGrows.length ? (
        <div className="phone-card-grid">
          {harvestedGrows.map((grow) => (
            <PhoneGrowCard
              key={grow.id}
              grow={grow}
              logs={state.logs}
              onQuickLog={openQuickLog}
              compact={state.settings.uiPreferences?.compactCards}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No archived grows yet"
          description="Mark a grow as harvested and it will move here for historical review."
          action={
            <Link className="secondary-btn" to="/grows">
              Back to Active Grows
            </Link>
          }
        />
      )}
    </div>
  )
}
