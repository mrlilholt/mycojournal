import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth.jsx'
import { fuzzyMatchesFind, fuzzyMatchesGrow, fuzzyMatchesSession } from '../../utils/search.js'

export default function TopBar({
  searchQuery,
  onSearchChange,
  onQuickLog,
  onToggleNav,
  onOpenAccount,
  grows = [],
  sessions = [],
  finds = []
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const searchRef = useRef(null)
  const suggestions = useMemo(
    () => {
      if (!searchQuery) return []
      const growResults = grows
        .filter((grow) => fuzzyMatchesGrow(grow, searchQuery))
        .slice(0, 4)
        .map((grow) => ({
          id: `grow-${grow.id}`,
          type: 'Grow',
          title: grow.name,
          subtitle: `${grow.species} · ${grow.status === 'complete' ? 'Harvested' : 'Active'} · ${grow.phase}`,
          to: `/grows/${grow.id}`
        }))
      const sessionResults = sessions
        .filter((session) => fuzzyMatchesSession(session, searchQuery))
        .slice(0, 4)
        .map((session) => ({
          id: `session-${session.id}`,
          type: 'Session',
          title: session.title || 'Foraging Session',
          subtitle: `${session.location?.placeLabel || 'Unknown location'} · ${session.outcome}`,
          to: `/forager/${session.id}`
        }))
      const findResults = finds
        .filter((find) => fuzzyMatchesFind(find, searchQuery))
        .slice(0, 4)
        .map((find) => ({
          id: `find-${find.id}`,
          type: 'Find',
          title: find.species?.commonName || find.species?.latinName || 'Unknown find',
          subtitle: `${find.species?.latinName || 'Manual identification'} · ${find.location?.placeLabel || 'Unknown location'}`,
          to: `/forager/${find.sessionId}#find-${find.id}`
        }))
      return [...growResults, ...sessionResults, ...findResults].slice(0, 8)
    },
    [grows, sessions, finds, searchQuery]
  )

  const handleSelect = (path) => {
    setOpen(false)
    onSearchChange('')
    navigate(path)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="topbar">
      <img className="topbar-logo" src="/myco.png" alt="MycoJournal" />
      <div className="topbar-content">
        <div className="topbar-search">
          <div className="topbar-search-box" ref={searchRef}>
            <input
              className="search-input"
              type="search"
              placeholder="Search grows, tags, species..."
              value={searchQuery}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                onSearchChange(event.target.value)
                setOpen(true)
              }}
            />
            {open && searchQuery && suggestions.length ? (
              <div className="search-results">
                {suggestions.map((grow) => (
                  <button
                    key={grow.id}
                    className="search-result"
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(grow.to)}
                  >
                    <strong>{grow.title}</strong>
                    <span className="muted">{grow.subtitle}</span>
                    <span className="badge">{grow.type}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="mobile-nav-toggle"
            type="button"
            onClick={onToggleNav}
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </button>
          <button className="secondary-btn" type="button" onClick={onQuickLog}>
            Quick Log
          </button>
          <button className="topbar-avatar-btn" type="button" onClick={onOpenAccount} aria-label="Open account settings">
            {user?.photoURL ? (
              <img className="topbar-avatar" src={user.photoURL} alt={user.displayName || 'User'} />
            ) : (
              <span className="topbar-avatar-fallback">{user?.displayName?.[0] || 'U'}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
