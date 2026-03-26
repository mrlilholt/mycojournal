import { NavLink } from 'react-router-dom'

const links = [
  {
    to: '/grows',
    label: 'Grows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10c6-6 10-6 16 0" />
        <path d="M6 14c4-4 8-4 12 0" />
        <path d="M8 18c2-2 6-2 8 0" />
      </svg>
    )
  },
  {
    to: '/forager',
    label: 'Forager Log',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 20c6-6 6-10 12-16" />
        <path d="M8 12c1 2 2 3 4 4" />
        <path d="M5 19h14" />
      </svg>
    )
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19V5" />
        <path d="M10 19V9" />
        <path d="M16 19V3" />
        <path d="M22 19V13" />
      </svg>
    )
  },
  {
    to: '/gallery',
    label: 'Gallery',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M21 15l-4.5-4.5L10 17l-3-3L3 18" />
      </svg>
    )
  },
  {
    to: '/harvests',
    label: 'Harvests',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 4c0 4 2.5 7 5 7s5-3 5-7" />
        <path d="M12 11v8" />
        <path d="M8 19h8" />
        <path d="M9 7c0 2 1.3 4 3 4s3-2 3-4" />
      </svg>
    )
  },
  {
    to: '/species',
    label: 'Species',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2c4 4 6 7 6 10a6 6 0 1 1-12 0c0-3 2-6 6-10z" />
        <path d="M12 14v6" />
      </svg>
    )
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-1.6 2.7-0.2-.1a1.6 1.6 0 0 0-1.7.1l-0.1.1a1.6 1.6 0 0 0-.6 1.6v.3H8.4v-.3a1.6 1.6 0 0 0-.6-1.6l-.1-.1a1.6 1.6 0 0 0-1.7-.1l-.2.1-1.6-2.7.1-.1a1.6 1.6 0 0 0 .3-1.8v-.2a1.6 1.6 0 0 0-1.1-1.3H3v-3h.4a1.6 1.6 0 0 0 1.1-1.3v-.2a1.6 1.6 0 0 0-.3-1.8l-.1-.1L5.7 3l.2.1a1.6 1.6 0 0 0 1.7-.1l.1-.1a1.6 1.6 0 0 0 .6-1.6V1h7.2v.3a1.6 1.6 0 0 0 .6 1.6l.1.1a1.6 1.6 0 0 0 1.7.1l.2-.1 1.6 2.7-.1.1a1.6 1.6 0 0 0-.3 1.8v.2a1.6 1.6 0 0 0 1.1 1.3H21v3h-.4a1.6 1.6 0 0 0-1.1 1.3Z" />
      </svg>
    )
  }
]

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <img src="/myco.png" alt="MycoJournal" />
        </div>
      </div>
      <nav className="nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            onClick={onClose}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <NavLink to="/new-grow" className="primary-btn full" onClick={onClose}>
          + New Grow
        </NavLink>
      </div>
    </aside>
  )
}
