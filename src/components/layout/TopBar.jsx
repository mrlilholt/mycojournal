import { useAuth } from '../../store/auth.jsx'

export default function TopBar({ searchQuery, onSearchChange, onQuickLog }) {
  const { signOut } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <input
          className="search-input"
          type="search"
          placeholder="Search grows, tags, species..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="topbar-actions">
        <button className="secondary-btn" type="button" onClick={onQuickLog}>
          Quick Log
        </button>
        <button className="ghost-btn" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
    </header>
  )
}
