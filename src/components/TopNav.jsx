import IconButton from './IconButton.jsx'

export default function TopNav({ title }) {
  return (
    <div className="top-nav">
      <div className="nav-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </div>
      <div className="title">{title}</div>
      <IconButton>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </svg>
      </IconButton>
    </div>
  )
}
