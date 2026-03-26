function encodeQuery(value) {
  return encodeURIComponent(String(value || '').trim())
}

function normalizeSpeciesQuery({ commonName, latinName }) {
  return String(latinName || commonName || '').trim()
}

export function buildWikipediaUrl({ commonName, latinName }) {
  const term = normalizeSpeciesQuery({ commonName, latinName })
  if (!term) return ''
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeQuery(term)}`
}

export function buildINaturalistSearchUrl({ commonName, latinName, placeLabel, observedAt }) {
  const query = normalizeSpeciesQuery({ commonName, latinName })
  if (!query) return ''
  const params = new URLSearchParams()
  params.set('q', query)
  if (placeLabel) params.set('place', placeLabel)
  if (observedAt) params.set('observed_on', new Date(observedAt).toISOString().slice(0, 10))
  return `https://www.inaturalist.org/observations?${params.toString()}`
}

export function buildINaturalistTaxonUrl({ commonName, latinName, taxonId }) {
  if (taxonId) {
    return `https://www.inaturalist.org/taxa/${encodeURIComponent(taxonId)}`
  }
  const query = normalizeSpeciesQuery({ commonName, latinName })
  if (!query) return ''
  return `https://www.inaturalist.org/taxa/search?q=${encodeQuery(query)}`
}

export function buildForagerExternalLinks({ commonName, latinName, taxonId, placeLabel, observedAt }) {
  return {
    wikipediaUrl: buildWikipediaUrl({ commonName, latinName }),
    iNaturalistSearchUrl: buildINaturalistSearchUrl({
      commonName,
      latinName,
      placeLabel,
      observedAt
    }),
    iNaturalistTaxonUrl: buildINaturalistTaxonUrl({ commonName, latinName, taxonId })
  }
}
