import { getMergedForagerSpeciesAliases, matchForagerSpecies, normalizeForagerName } from './foragerSpeciesMatch.js'

const INAT_FUNGI_TAXON_ID = 47170
const speciesLookupCache = new Map()

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapINatTaxon(result) {
  if (!result?.name) return null
  return {
    key: result.name ? slugify(result.name) : `inaturalist-${result.id}`,
    commonName: result.preferred_common_name || '',
    latinName: result.name,
    taxonId: result.id || null,
    matchSource: 'inaturalist'
  }
}

export async function lookupINaturalistFungus(query) {
  const normalized = normalizeForagerName(query)
  if (!normalized) return null

  const params = new URLSearchParams()
  params.set('q', query)
  params.set('taxon_id', String(INAT_FUNGI_TAXON_ID))
  params.set('per_page', '10')

  const response = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?${params.toString()}`)
  if (!response.ok) {
    throw new Error('iNaturalist lookup failed')
  }

  const data = await response.json()
  const results = Array.isArray(data?.results) ? data.results : []
  if (!results.length) return null

  const exact = results.find((result) => {
    const scientific = normalizeForagerName(result.name)
    const common = normalizeForagerName(result.preferred_common_name)
    return scientific === normalized || common === normalized
  })

  return mapINatTaxon(exact || results[0])
}

export async function resolveForagerSpecies(query, customAliases = {}) {
  const normalized = normalizeForagerName(query)
  if (!normalized) return null

  if (speciesLookupCache.has(normalized)) {
    return speciesLookupCache.get(normalized)
  }

  try {
    const iNatMatch = await lookupINaturalistFungus(query)
    if (iNatMatch) {
      speciesLookupCache.set(normalized, iNatMatch)
      return iNatMatch
    }
  } catch (error) {
    console.warn('iNaturalist species lookup failed', error)
  }

  const aliasMatch = matchForagerSpecies(query, getMergedForagerSpeciesAliases(customAliases))
  if (!aliasMatch) {
    speciesLookupCache.set(normalized, null)
    return null
  }

  const resolved = {
    key: aliasMatch.key,
    commonName: aliasMatch.commonName,
    latinName: aliasMatch.latinName,
    taxonId: null,
    matchSource: aliasMatch.matchSource
  }
  speciesLookupCache.set(normalized, resolved)
  return resolved
}
