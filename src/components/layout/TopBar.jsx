import { useAuth } from '../../store/auth.jsx'

export default function TopBar({ searchQuery, onSearchChange, onQuickLog, onToggleNav }) {
  const { signOut } = useAuth()

  return (
    <header className="topbar">
      <img className="topbar-logo" src="/myco.png" alt="MycoJournal" />
      <div className="topbar-content">
        <div className="topbar-search">
          <input
            className="search-input"
            type="search"
            placeholder="Search grows, tags, species..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
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
          <button className="ghost-btn" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
