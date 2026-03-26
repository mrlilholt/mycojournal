import { FORAGER_SPECIES_DICTIONARY } from './foragerSpeciesDictionary.js'

export function normalizeForagerName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function getMergedForagerSpeciesAliases(customAliases = {}) {
  const base = {}
  FORAGER_SPECIES_DICTIONARY.forEach((entry) => {
    base[entry.key] = {
      ...entry,
      aliases: [...new Set([entry.commonName, entry.latinName, ...(entry.aliases || [])])]
    }
  })

  Object.entries(customAliases || {}).forEach(([key, value]) => {
    const existing = base[key] || { key, commonName: '', latinName: '', aliases: [] }
    base[key] = {
      ...existing,
      ...value,
      aliases: [
        ...new Set([
          existing.commonName,
          existing.latinName,
          ...(existing.aliases || []),
          value.commonName,
          value.latinName,
          ...(value.aliases || [])
        ].filter(Boolean))
      ]
    }
  })

  return base
}

export function matchForagerSpecies(input, customAliases = {}) {
  const normalized = normalizeForagerName(input)
  if (!normalized) return null

  const merged = getMergedForagerSpeciesAliases(customAliases)
  const entries = Object.values(merged)

  const exact = entries.find((entry) =>
    [entry.commonName, entry.latinName, ...(entry.aliases || [])]
      .map((alias) => normalizeForagerName(alias))
      .includes(normalized)
  )
  if (exact) {
    return {
      key: exact.key,
      commonName: exact.commonName,
      latinName: exact.latinName,
      matchSource: 'alias'
    }
  }

  const fuzzy = entries.find((entry) =>
    [entry.commonName, entry.latinName, ...(entry.aliases || [])]
      .map((alias) => normalizeForagerName(alias))
      .some((alias) => alias.includes(normalized) || normalized.includes(alias))
  )
  if (!fuzzy) return null

  return {
    key: fuzzy.key,
    commonName: fuzzy.commonName,
    latinName: fuzzy.latinName,
    matchSource: 'alias'
  }
}

export function applyForagerSpeciesAutofill(input, mode, customAliases = {}) {
  const match = matchForagerSpecies(input, customAliases)
  if (!match) return null
  return mode === 'latin'
    ? { commonName: match.commonName, latinName: input, matchedPresetKey: match.key, matchSource: match.matchSource }
    : { commonName: input, latinName: match.latinName, matchedPresetKey: match.key, matchSource: match.matchSource }
}
