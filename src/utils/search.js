export function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function fuzzyIncludes(query, ...fields) {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) return true
  const haystack = fields.map((field) => normalizeSearch(field)).join(' ')
  return haystack.includes(normalizedQuery)
}

export function fuzzyMatchesGrow(grow, query) {
  return fuzzyIncludes(
    query,
    grow.name,
    grow.species,
    grow.method,
    grow.phase,
    grow.status,
    (grow.tags || []).join(' ')
  )
}
