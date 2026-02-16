export default function TagPills({ tags = [] }) {
  if (!tags.length) return <span className="muted">No tags</span>
  return (
    <div className="tag-pills">
      {tags.map((tag) => (
        <span key={tag} className="tag-pill">
          {tag}
        </span>
      ))}
    </div>
  )
}
