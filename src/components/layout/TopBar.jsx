import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth.jsx'
import { fuzzyMatchesGrow } from '../../utils/search.js'

export default function TopBar({
  searchQuery,
  onSearchChange,
  onQuickLog,
  onToggleNav,
  onOpenAccount,
  grows = []
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const searchRef = useRef(null)
  const suggestions = useMemo(
    () =>
      searchQuery
        ? grows.filter((grow) => fuzzyMatchesGrow(grow, searchQuery)).slice(0, 8)
        : [],
    [grows, searchQuery]
  )

  const handleSelect = (growId) => {
    setOpen(false)
    onSearchChange('')
    navigate(`/grows/${growId}`)
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
                    onClick={() => handleSelect(grow.id)}
                  >
                    <strong>{grow.name}</strong>
                    <span className="muted">
                      {grow.species} · {grow.status === 'complete' ? 'Harvested' : 'Active'} · {grow.phase}
                    </span>
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
