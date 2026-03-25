import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useStore } from '../store/store.jsx'
import { formatDateTime } from '../utils/date.js'
import { fuzzyMatchesGrow, fuzzyIncludes } from '../utils/search.js'

function normalizePhoto(photo, fallbackId) {
  if (!photo) return null
  if (typeof photo === 'string') {
    return { id: fallbackId, url: photo }
  }
  const url = photo.url || photo.secure_url || photo.src
  if (!url) return null
  return {
    id: photo.id || photo.publicId || photo.assetId || fallbackId,
    url,
    publicId: photo.publicId || photo.public_id || null,
    assetId: photo.assetId || photo.asset_id || null
  }
}

function getEntryPhotos(entry) {
  if (Array.isArray(entry?.photos)) return entry.photos
  if (entry?.photo) return [entry.photo]
  return []
}

function buildGrowPhotos(grow, logs, harvests) {
  const logPhotos = logs
    .filter((log) => log.growId === grow.id && getEntryPhotos(log).length)
    .flatMap((log) =>
      getEntryPhotos(log)
        .map((photo, photoIndex) => {
          const normalized = normalizePhoto(photo, `${log.id}-photo-${photoIndex}`)
          if (!normalized) return null
          return {
            ...normalized,
            id: `${log.id}-${normalized.id}`,
            timestamp: log.timestamp,
            kind: 'Log',
            label:
              log.growthMmPerDay != null
                ? `${Number(log.growthMmPerDay).toFixed(1)} mm/day`
                : log.notes || 'Observation',
            notes: log.notes || '',
            block: log.block || '—',
            treatment: log.treatment || '—',
            species: grow.species,
            growName: grow.name,
            growId: grow.id
          }
        })
        .filter(Boolean)
    )

  const harvestPhotos = harvests
    .filter((harvest) => harvest.growId === grow.id && getEntryPhotos(harvest).length)
    .flatMap((harvest) =>
      getEntryPhotos(harvest)
        .map((photo, photoIndex) => {
          const normalized = normalizePhoto(photo, `${harvest.id}-photo-${photoIndex}`)
          if (!normalized) return null
          return {
            ...normalized,
            id: `${harvest.id}-${normalized.id}`,
            timestamp: harvest.date,
            kind: 'Harvest',
            label: `Flush ${harvest.flushNumber}`,
            notes: harvest.notes || '',
            weight: harvest.weight ?? null,
            quality: harvest.quality ?? '—',
            species: grow.species,
            growName: grow.name,
            growId: grow.id
          }
        })
        .filter(Boolean)
    )

  return [...logPhotos, ...harvestPhotos].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

function PhotoLightbox({ items, index, onClose, onPrev, onNext }) {
  const active = items[index]
  if (!active) return null

  return (
    <div className="gallery-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="gallery-lightbox__close" type="button" onClick={onClose}>
        Close
      </button>
      {items.length > 1 ? (
        <>
          <button
            className="gallery-lightbox__nav gallery-lightbox__nav--prev"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onPrev()
            }}
          >
            Prev
          </button>
          <button
            className="gallery-lightbox__nav gallery-lightbox__nav--next"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onNext()
            }}
          >
            Next
          </button>
        </>
      ) : null}
      <div className="gallery-lightbox__card" onClick={(event) => event.stopPropagation()}>
        <img src={active.url} alt={`${active.growName} ${active.kind}`} />
        <div className="gallery-lightbox__meta">
          <strong>{active.growName}</strong>
          <span>{active.species}</span>
          <span>{active.kind} · {active.label}</span>
          <span>{formatDateTime(active.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

function PhotoCarouselCard({ title, subtitle, items, openGrowHref }) {
  const [index, setIndex] = useState(items.length - 1)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    setIndex(items.length ? items.length - 1 : 0)
  }, [items])

  if (!items.length) return null

  const active = items[index]
  const goPrev = () => setIndex((current) => (current <= 0 ? items.length - 1 : current - 1))
  const goNext = () => setIndex((current) => (current >= items.length - 1 ? 0 : current + 1))

  return (
    <>
      <article className="gallery-card glass-surface">
        <div className="gallery-card__header">
          <div>
            <h3>{title}</h3>
            <p className="muted">{subtitle}</p>
          </div>
          {openGrowHref ? (
            <Link className="ghost-btn table-action-btn" to={openGrowHref}>
              Open Grow
            </Link>
          ) : null}
        </div>

        <div className="gallery-card__hero">
          <button className="gallery-card__nav gallery-card__nav--prev" type="button" onClick={goPrev}>
            Prev
          </button>
          <button className="gallery-card__hero-button" type="button" onClick={() => setLightboxOpen(true)}>
            <img src={active.url} alt={`${title} ${active.kind}`} />
          </button>
          <button className="gallery-card__nav gallery-card__nav--next" type="button" onClick={goNext}>
            Next
          </button>
        </div>

        <div className="gallery-card__meta">
          <span className="badge">{active.kind}</span>
          <strong>{active.label}</strong>
          <span className="muted">{formatDateTime(active.timestamp)}</span>
        </div>

        <div className="gallery-card__detail">
          {active.kind === 'Log' ? (
            <>
              <span>{active.growName}</span>
              <span>Block {active.block}</span>
              <span>Treatment {active.treatment}</span>
            </>
          ) : (
            <>
              <span>{active.growName}</span>
              <span>{active.weight != null ? `${active.weight} lbs` : 'Weight —'}</span>
              <span>Quality {active.quality}</span>
            </>
          )}
        </div>

        <p className="gallery-card__notes">{active.notes || 'No notes'}</p>

        <div className="gallery-card__timeline">
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              className={itemIndex === index ? 'gallery-card__thumb is-active' : 'gallery-card__thumb'}
              type="button"
              onClick={() => setIndex(itemIndex)}
            >
              <img src={item.url} alt={`${title} ${item.kind} ${itemIndex + 1}`} />
              <span>{new Date(item.timestamp).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      </article>

      {lightboxOpen ? (
        <PhotoLightbox
          items={items}
          index={index}
          onClose={() => setLightboxOpen(false)}
          onPrev={goPrev}
          onNext={goNext}
        />
      ) : null}
    </>
  )
}

export default function GalleryPage() {
  const { state } = useStore()
  const { searchQuery } = useOutletContext()
  const defaultGalleryView = state.settings.uiPreferences?.defaultGalleryView || 'grow'
  const [viewMode, setViewMode] = useState(defaultGalleryView)

  useEffect(() => {
    setViewMode(defaultGalleryView)
  }, [defaultGalleryView])

  const growGroups = useMemo(() => {
    return state.grows
      .map((grow) => ({
        id: grow.id,
        title: grow.name,
        subtitle: `${grow.species} · ${grow.phase}`,
        openGrowHref: `/grows/${grow.id}`,
        items: buildGrowPhotos(grow, state.logs, state.harvests)
      }))
      .filter(({ items }) => items.length)
      .filter(({ title, subtitle, openGrowHref }) => {
        if (!searchQuery) return true
        const growId = openGrowHref?.split('/').pop()
        const grow = state.grows.find((item) => item.id === growId)
        return grow ? fuzzyMatchesGrow(grow, searchQuery) : fuzzyIncludes(searchQuery, title, subtitle)
      })
      .sort((a, b) => new Date(b.items[b.items.length - 1]?.timestamp || 0) - new Date(a.items[a.items.length - 1]?.timestamp || 0))
  }, [state.grows, state.logs, state.harvests, searchQuery])

  const speciesGroups = useMemo(() => {
    const grouped = new Map()
    growGroups.forEach((group) => {
      const species = group.subtitle.split(' · ')[0]
      const existing = grouped.get(species) || []
      grouped.set(species, [...existing, ...group.items])
    })
    return Array.from(grouped.entries())
      .map(([species, items]) => ({
        id: species,
        title: species,
        subtitle: `${new Set(items.map((item) => item.growName)).size} grows · ${items.length} photos`,
        openGrowHref: '',
        items: items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      }))
      .sort((a, b) => b.items.length - a.items.length)
  }, [growGroups])

  const groups = viewMode === 'species' ? speciesGroups : growGroups

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Photo Gallery</h1>
          <p className="muted">Review each grow as a chronological visual record.</p>
        </div>
        <div className="toggle-row">
          <button
            className={viewMode === 'grow' ? 'secondary-btn' : 'ghost-btn'}
            type="button"
            onClick={() => setViewMode('grow')}
          >
            By Grow
          </button>
          <button
            className={viewMode === 'species' ? 'secondary-btn' : 'ghost-btn'}
            type="button"
            onClick={() => setViewMode('species')}
          >
            By Species
          </button>
        </div>
      </div>

      {groups.length ? (
        <div className="gallery-grid">
          {groups.map((group) => (
            <PhotoCarouselCard
              key={group.id}
              title={group.title}
              subtitle={group.subtitle}
              items={group.items}
              openGrowHref={group.openGrowHref}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No photo journals yet"
          description="Add photos to quick logs or harvests and they will appear here as growth timelines."
          action={
            <Link className="secondary-btn" to="/grows">
              Go to Grows
            </Link>
          }
        />
      )}
    </div>
  )
}
