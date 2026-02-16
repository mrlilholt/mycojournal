export default function FiltersBar({ filters, onChange, speciesOptions, tagOptions, phaseOptions }) {
  return (
    <div className="filters-bar">
      <select
        value={filters.status}
        onChange={(event) => onChange({ ...filters, status: event.target.value })}
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="complete">Completed</option>
      </select>
      <select
        value={filters.species}
        onChange={(event) => onChange({ ...filters, species: event.target.value })}
      >
        <option value="all">All species</option>
        {speciesOptions.map((species) => (
          <option key={species} value={species}>
            {species}
          </option>
        ))}
      </select>
      <select
        value={filters.phase}
        onChange={(event) => onChange({ ...filters, phase: event.target.value })}
      >
        <option value="all">All phases</option>
        {phaseOptions.map((phase) => (
          <option key={phase} value={phase}>
            {phase}
          </option>
        ))}
      </select>
      <select
        value={filters.tag}
        onChange={(event) => onChange({ ...filters, tag: event.target.value })}
      >
        <option value="all">All tags</option>
        {tagOptions.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  )
}
