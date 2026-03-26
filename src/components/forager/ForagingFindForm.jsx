import { useEffect, useMemo, useRef, useState } from 'react'
import { uploadEntryPhotos } from '../../utils/photos.js'
import {
  getMergedForagerSpeciesAliases,
  matchForagerSpecies
} from '../../utils/foragerSpeciesMatch.js'
import { buildForagerExternalLinks } from '../../utils/foragerExternalLinks.js'
import { reverseGeocode } from '../../utils/foragerLocation.js'
import { resolveForagerSpecies } from '../../utils/foragerSpeciesLookup.js'
import LazyForagingMap from './LazyForagingMap.jsx'

const confidenceOptions = ['certain', 'likely', 'possible']
const edibleOptions = ['unknown', 'edible', 'not-edible', 'do-not-consume']

function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function fromDateTimeLocal(value, fallback = new Date().toISOString()) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function formatOptionLabel(option) {
  return option
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function buildInitialFind(find, session) {
  return {
    id: find?.id || '',
    observedAt: find?.observedAt || session.startedAt || new Date().toISOString(),
    quantity: find?.quantity || '',
    specimenCount: find?.specimenCount ?? '',
    confidence: find?.confidence || 'likely',
    edibleStatus: find?.edibleStatus || 'unknown',
    substrate: find?.substrate || '',
    habitat: find?.habitat || '',
    hostTree: find?.hostTree || '',
    growthHabit: find?.growthHabit || '',
    notes: find?.notes || '',
    species: {
      commonName: find?.species?.commonName || '',
      latinName: find?.species?.latinName || '',
      matchedPresetKey: find?.species?.matchedPresetKey || null,
      taxonId: find?.species?.taxonId || null,
      matchSource: find?.species?.matchSource || 'manual'
    },
    location: {
      lat: find?.location?.lat ?? session.location?.lat ?? '',
      lng: find?.location?.lng ?? session.location?.lng ?? '',
      accuracyMeters: find?.location?.accuracyMeters ?? session.location?.accuracyMeters ?? null,
      placeLabel: find?.location?.placeLabel ?? session.location?.placeLabel ?? '',
      derivedFromSession: find?.location?.derivedFromSession !== false
    },
    weatherSnapshot: find?.weatherSnapshot || { inheritedFromSession: true },
    photos: find?.photos || [],
    externalLinks: find?.externalLinks || {
      wikipediaUrl: '',
      iNaturalistSearchUrl: ''
    }
  }
}

export default function ForagingFindForm({
  value,
  onChange,
  onRemove,
  session,
  userId,
  aliasSettings,
  showRemoveButton = true,
  mode = 'detailed'
}) {
  const [uploading, setUploading] = useState(false)
  const [resolvingSpecies, setResolvingSpecies] = useState(false)
  const [speciesStatus, setSpeciesStatus] = useState('')
  const [showDetails, setShowDetails] = useState(mode === 'detailed')
  const lastEditedField = useRef('common')
  const lastResolvedQuery = useRef('')
  const aliases = useMemo(() => getMergedForagerSpeciesAliases(aliasSettings), [aliasSettings])
  const match = useMemo(
    () =>
      matchForagerSpecies(value.species?.commonName || value.species?.latinName, aliases),
    [value.species?.commonName, value.species?.latinName, aliases]
  )

  const patchFind = (updates) => {
    const next = { ...value, ...updates }
    next.externalLinks = {
      ...buildForagerExternalLinks({
        commonName: next.species?.commonName,
        latinName: next.species?.latinName,
        taxonId: next.species?.taxonId,
        placeLabel: next.location?.placeLabel || session.location?.placeLabel,
        observedAt: next.observedAt
      })
    }
    onChange(next)
  }

  const patchSpecies = (field, inputValue) => {
    lastEditedField.current = field
    const oppositeField = field === 'latin' ? 'commonName' : 'latinName'
    const shouldClearOpposite = value.species?.matchSource && value.species.matchSource !== 'manual'
    patchFind({
      species: {
        ...value.species,
        [field === 'latin' ? 'latinName' : 'commonName']: inputValue,
        ...(shouldClearOpposite ? { [oppositeField]: '' } : {}),
        matchedPresetKey: null,
        taxonId: null,
        matchSource: 'manual'
      }
    })
  }

  useEffect(() => {
    if (value.species?.matchSource !== 'manual') return undefined
    const query =
      lastEditedField.current === 'latin'
        ? value.species?.latinName?.trim()
        : value.species?.commonName?.trim()
    if (!query) {
      setSpeciesStatus('')
      setResolvingSpecies(false)
      return undefined
    }
    if (lastResolvedQuery.current === `${lastEditedField.current}:${query}`) {
      return undefined
    }

    let cancelled = false
    setResolvingSpecies(true)
    setSpeciesStatus('Looking up fungus...')

    const timer = window.setTimeout(async () => {
      try {
        const resolved = await resolveForagerSpecies(query, aliasSettings)
        if (cancelled) return
        if (!resolved) {
          setSpeciesStatus('No species match yet')
          setResolvingSpecies(false)
          lastResolvedQuery.current = `${lastEditedField.current}:${query}`
          return
        }
        patchFind({
          species: {
            commonName:
              lastEditedField.current === 'common'
                ? resolved.commonName || value.species?.commonName || query
                : resolved.commonName || '',
            latinName: resolved.latinName || value.species?.latinName || query,
            matchedPresetKey: resolved.key,
            taxonId: resolved.taxonId || null,
            matchSource: resolved.matchSource
          }
        })
        lastResolvedQuery.current = `${lastEditedField.current}:${query}`
        setSpeciesStatus(
          resolved.matchSource === 'inaturalist'
            ? 'Matched via iNaturalist'
            : 'Matched via local alias'
        )
      } catch (error) {
        if (cancelled) return
        console.error(error)
        setSpeciesStatus('Species lookup failed')
      } finally {
        if (!cancelled) setResolvingSpecies(false)
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    aliasSettings,
    value.species?.commonName,
    value.species?.latinName,
    value.species?.matchSource
  ])

  const handleFiles = async (files) => {
    const fileList = Array.from(files || [])
    if (!fileList.length || !userId) return
    setUploading(true)
    try {
      const uploaded = await uploadEntryPhotos({
        userId,
        entryType: 'foragingFinds',
        entryId: value.id || `draft-${Date.now()}`,
        files: fileList
      })
      patchFind({ photos: [...(value.photos || []), ...uploaded] })
    } finally {
      setUploading(false)
    }
  }

  const hasSpeciesQuery = Boolean(value.species?.latinName || value.species?.commonName)
  const isQuickMode = mode === 'quick'

  useEffect(() => {
    setShowDetails(mode === 'detailed')
  }, [mode])

  return (
    <div className="forager-find-form glass-surface">
      <div className="forager-find-form__header">
        <h4>{value.species?.commonName || value.species?.latinName || 'New Mushroom Find'}</h4>
        {showRemoveButton ? (
          <button className="ghost-btn" type="button" onClick={onRemove}>
            Remove Find
          </button>
        ) : null}
      </div>

      <div className="forager-find-grid">
        <label>
          Common Name
          <input
            type="text"
            value={value.species?.commonName || ''}
            onChange={(event) => patchSpecies('common', event.target.value)}
            placeholder="Lion's Mane"
          />
        </label>
        <label>
          Latin Name
          <input
            type="text"
            value={value.species?.latinName || ''}
            onChange={(event) => patchSpecies('latin', event.target.value)}
            placeholder="Hericium erinaceus"
          />
        </label>
        <div className="full">
          <span className="muted">
            {speciesStatus || (match ? `Matched: ${match.commonName}` : 'Enter a common or Latin name')}
            {resolvingSpecies ? ' ...' : ''}
          </span>
        </div>
        {isQuickMode ? null : (
          <>
        <label>
          Observed At
          <input
            type="datetime-local"
            value={toDateTimeLocal(value.observedAt)}
            onChange={(event) => patchFind({ observedAt: fromDateTimeLocal(event.target.value, session.startedAt) })}
          />
        </label>
        <label>
          Quantity
          <input
            type="text"
            value={value.quantity || ''}
            onChange={(event) => patchFind({ quantity: event.target.value })}
            placeholder="3 clusters"
          />
        </label>
        <label>
          Specimen Count
          <input
            type="number"
            value={value.specimenCount ?? ''}
            onChange={(event) => patchFind({ specimenCount: event.target.value === '' ? '' : Number(event.target.value) })}
          />
        </label>
        <div className="full">
          <span className="label">Confidence</span>
          <div className="forager-find-form__segmented">
            {confidenceOptions.map((option) => (
              <button
                key={option}
                className={`segmented-btn ${value.confidence === option ? 'is-active' : ''}`}
                type="button"
                onClick={() => patchFind({ confidence: option })}
              >
                {formatOptionLabel(option)}
              </button>
            ))}
          </div>
        </div>
        <div className="full">
          <span className="label">Edible Status</span>
          <div className="forager-find-form__segmented forager-find-form__segmented--wide">
            {edibleOptions.map((option) => (
              <button
                key={option}
                className={`segmented-btn ${value.edibleStatus === option ? 'is-active' : ''}`}
                type="button"
                onClick={() => patchFind({ edibleStatus: option })}
              >
                {formatOptionLabel(option)}
              </button>
            ))}
          </div>
        </div>
        <label>
          Habitat
          <input
            type="text"
            value={value.habitat || ''}
            onChange={(event) => patchFind({ habitat: event.target.value })}
            placeholder="Mixed hardwood forest"
          />
        </label>
        <label>
          Substrate
          <input
            type="text"
            value={value.substrate || ''}
            onChange={(event) => patchFind({ substrate: event.target.value })}
            placeholder="Dead oak log"
          />
        </label>
        <label>
          Host Tree
          <input
            type="text"
            value={value.hostTree || ''}
            onChange={(event) => patchFind({ hostTree: event.target.value })}
            placeholder="Beech"
          />
        </label>
        <label>
          Growth Habit
          <input
            type="text"
            value={value.growthHabit || ''}
            onChange={(event) => patchFind({ growthHabit: event.target.value })}
            placeholder="Cluster"
          />
        </label>
        <label className="full">
          Notes
          <textarea
            rows="3"
            value={value.notes || ''}
            onChange={(event) => patchFind({ notes: event.target.value })}
            placeholder="Cap texture, smell, nearby plants..."
          />
        </label>
          </>
        )}
      </div>

      {isQuickMode ? (
        <div className="forager-find-form__quick-actions">
          <button
            className="secondary-btn"
            type="button"
            onClick={() => setShowDetails((current) => !current)}
          >
            {showDetails ? 'Hide Details' : 'Add Details'}
          </button>
        </div>
      ) : null}

      {(!isQuickMode || showDetails) ? (
        <>
          <div className="forager-find-form__meta-row">
            <div className="forager-find-form__segmented">
              <button
                className={`segmented-btn ${value.location?.derivedFromSession !== false ? 'is-active' : ''}`}
                type="button"
                onClick={() =>
                  patchFind({
                    location: {
                      ...value.location,
                      lat: session.location?.lat ?? '',
                      lng: session.location?.lng ?? '',
                      placeLabel: session.location?.placeLabel ?? '',
                      accuracyMeters: session.location?.accuracyMeters ?? null,
                      derivedFromSession: true
                    }
                  })
                }
              >
                Use Session Location
              </button>
              <button
                className={`segmented-btn ${value.location?.derivedFromSession === false ? 'is-active' : ''}`}
                type="button"
                onClick={() =>
                  patchFind({
                    location: {
                      ...value.location,
                      lat:
                        value.location?.derivedFromSession !== false
                          ? session.location?.lat ?? ''
                          : value.location?.lat ?? '',
                      lng:
                        value.location?.derivedFromSession !== false
                          ? session.location?.lng ?? ''
                          : value.location?.lng ?? '',
                      placeLabel:
                        value.location?.derivedFromSession !== false
                          ? session.location?.placeLabel ?? ''
                          : value.location?.placeLabel ?? '',
                      accuracyMeters:
                        value.location?.derivedFromSession !== false
                          ? session.location?.accuracyMeters ?? null
                          : value.location?.accuracyMeters ?? null,
                      derivedFromSession: false
                    }
                  })
                }
              >
                Exact Mushroom Spot
              </button>
            </div>
            {match ? (
              <span className="badge">Matched: {match.commonName}</span>
            ) : (
              <span className="muted">Manual species entry</span>
            )}
          </div>

          {value.location?.derivedFromSession === false ? (
            <div className="forager-find-form__map-block">
              <LazyForagingMap
                lat={value.location?.lat === '' ? null : Number(value.location?.lat)}
                lng={value.location?.lng === '' ? null : Number(value.location?.lng)}
                onChange={async ({ lat, lng }) => {
                  patchFind({
                    location: {
                      ...value.location,
                      lat,
                      lng,
                      derivedFromSession: false
                    }
                  })
                  try {
                    const placeLabel = await reverseGeocode({ lat, lng })
                    patchFind({
                      location: {
                        ...value.location,
                        lat,
                        lng,
                        placeLabel,
                        derivedFromSession: false
                      }
                    })
                  } catch {
                    // non-blocking
                  }
                }}
              />
              <div className="forager-find-form__coord-row">
                <span>{value.location?.placeLabel || 'Tap map to set exact find spot'}</span>
                <span>
                  {value.location?.lat !== '' && value.location?.lng !== ''
                    ? `${Number(value.location?.lat).toFixed(5)}, ${Number(value.location?.lng).toFixed(5)}`
                    : 'No pin set'}
                </span>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="forager-find-form__actions">
        <button
          className="ghost-btn"
          type="button"
          disabled={!value.externalLinks?.wikipediaUrl}
          onClick={() => {
            if (value.externalLinks?.wikipediaUrl) {
              window.open(value.externalLinks.wikipediaUrl, '_blank', 'noopener,noreferrer')
            }
          }}
        >
          More Info
        </button>
        <button
          className="ghost-btn"
          type="button"
          disabled={!hasSpeciesQuery}
          onClick={() => {
            const target = value.externalLinks?.iNaturalistTaxonUrl || value.externalLinks?.iNaturalistSearchUrl
            if (target) {
              window.open(target, '_blank', 'noopener,noreferrer')
            }
          }}
        >
          Open in iNaturalist
        </button>
        <label className="file-picker">
          <span className="file-picker__button">{uploading ? 'Uploading...' : 'Choose Photos'}</span>
          <span className="file-picker__name">
            {value.photos?.length ? `${value.photos.length} photo${value.photos.length > 1 ? 's' : ''}` : 'No photos'}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </label>
      </div>

      {value.photos?.length ? (
        <div className="forager-find-form__photo-strip">
          {value.photos.map((photo) => (
            <div key={photo.id || photo.url} className="forager-find-form__photo">
              <img src={photo.url} alt={value.species?.commonName || value.species?.latinName || 'Foraged mushroom'} />
              <button
                className="ghost-btn table-action-btn"
                type="button"
                onClick={() =>
                  patchFind({
                    photos: value.photos.filter(
                      (item) => (item.id || item.url) !== (photo.id || photo.url)
                    )
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
