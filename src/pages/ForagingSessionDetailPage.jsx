import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ForagingFindForm, { buildInitialFind } from '../components/forager/ForagingFindForm.jsx'
import ConfirmModal from '../components/ui/ConfirmModal.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ForagingSessionForm from '../components/forager/ForagingSessionForm.jsx'
import LazyForagingMap from '../components/forager/LazyForagingMap.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useAuth } from '../store/auth.jsx'
import { useStore } from '../store/store.jsx'
import { formatDateTime } from '../utils/date.js'
import { uid } from '../utils/id.js'
import { buildForagerExternalLinks } from '../utils/foragerExternalLinks.js'
import { deleteEntryPhotos } from '../utils/photos.js'
import {
  evaluateMushroomWeather,
  fetchWeatherForLocation,
  formatMushroomForecastLabel,
  formatRainMm,
  formatTemperatureF
} from '../utils/foragerWeather.js'
import {
  formatApproximateLocation,
  getCurrentPosition,
  reverseGeocode
} from '../utils/foragerLocation.js'

function WeatherMetric({ icon, label, value }) {
  return (
    <span className="forager-weather-metric">
      <span className="forager-weather-metric__icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{label}</strong>
      {value}
    </span>
  )
}

export default function ForagingSessionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state, actions } = useStore()
  const [editOpen, setEditOpen] = useState(false)
  const [addFindOpen, setAddFindOpen] = useState(false)
  const [addFindMode, setAddFindMode] = useState('')
  const [draftFind, setDraftFind] = useState(null)
  const [savingFind, setSavingFind] = useState(false)
  const [editingFindId, setEditingFindId] = useState('')
  const [editingFindDraft, setEditingFindDraft] = useState(null)
  const [editingFindOriginal, setEditingFindOriginal] = useState(null)
  const [savingEditedFind, setSavingEditedFind] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [locationDraft, setLocationDraft] = useState(null)
  const [locating, setLocating] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [refreshingWeather, setRefreshingWeather] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [weatherMessage, setWeatherMessage] = useState('')
  const [weatherDraft, setWeatherDraft] = useState(null)
  const [recentWeatherDraft, setRecentWeatherDraft] = useState(null)
  const session = state.foragingSessions.find((item) => item.id === id)
  const finds = useMemo(
    () => state.foragingFinds.filter((find) => find.sessionId === id),
    [state.foragingFinds, id]
  )

  useEffect(() => {
    if (!window.location.hash) return
    const target = document.querySelector(window.location.hash)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [finds])

  useEffect(() => {
    if (!session) return
    setLocationDraft({
      lat: session.location?.lat ?? '',
      lng: session.location?.lng ?? '',
      accuracyMeters: session.location?.accuracyMeters ?? null,
      placeLabel: session.location?.placeLabel || '',
      privacy: 'private-exact'
    })
    setLocationMessage('')
  }, [session])

  useEffect(() => {
    setWeatherDraft(session?.weatherSnapshot || null)
    setRecentWeatherDraft(session?.recentWeather || null)
    setWeatherMessage('')
  }, [session?.weatherSnapshot, session?.recentWeather])

  if (!session) {
    return (
      <div className="page">
        <EmptyState
          title="Foraging session not found"
          description="This session no longer exists or the link is invalid."
          action={<Link className="secondary-btn" to="/forager">Back to Forager Log</Link>}
        />
      </div>
    )
  }

  const hasLocationChanges =
    locationDraft &&
    (locationDraft.lat !== (session.location?.lat ?? '') ||
      locationDraft.lng !== (session.location?.lng ?? '') ||
      locationDraft.placeLabel !== (session.location?.placeLabel || '') ||
      locationDraft.accuracyMeters !== (session.location?.accuracyMeters ?? null))

  const effectiveWeather = weatherDraft || session.weatherSnapshot
  const effectiveRecentWeather = recentWeatherDraft || session.recentWeather
  const weatherAssessment = evaluateMushroomWeather(effectiveWeather, effectiveRecentWeather)
  const aliasSettings = state.settings.foragerSpeciesAliases || {}

  const refreshWeatherForLocation = async (coords, startedAt = session.startedAt) => {
    if (coords?.lat == null || coords?.lng == null) {
      throw new Error('Coordinates required')
    }
    const updates = await fetchWeatherForLocation({
      lat: Number(coords.lat),
      lng: Number(coords.lng),
      at: startedAt
    })
    setWeatherDraft(updates.weatherSnapshot)
    setRecentWeatherDraft(updates.recentWeather)
    return updates
  }

  const handleUseMyLocation = async () => {
    setLocating(true)
    setLocationMessage('')
    try {
      const coords = await getCurrentPosition()
      let placeLabel = ''
      try {
        placeLabel = await reverseGeocode(coords)
      } catch {
        // keep coordinates even if reverse geocode fails
      }
      setLocationDraft({
        ...coords,
        placeLabel,
        privacy: 'private-exact'
      })
      setLocationMessage('Location captured. Save to keep it on this session.')
    } catch (error) {
      console.warn('Location unavailable', error)
      setLocationMessage('Unable to get your location. Check browser location permissions.')
    } finally {
      setLocating(false)
    }
  }

  const handleSaveLocation = async () => {
    if (!locationDraft) return
    setSavingLocation(true)
    setLocationMessage('')
    setWeatherMessage('')
    try {
      const savedLocation = {
        lat: locationDraft.lat === '' ? null : Number(locationDraft.lat),
        lng: locationDraft.lng === '' ? null : Number(locationDraft.lng),
        accuracyMeters: locationDraft.accuracyMeters ?? null,
        placeLabel: locationDraft.placeLabel || '',
        privacy: 'private-exact'
      }
      let weatherUpdates = {}
      if (savedLocation.lat != null && savedLocation.lng != null) {
        try {
          weatherUpdates = await refreshWeatherForLocation(savedLocation)
        } catch (error) {
          console.warn('Weather unavailable after location save', error)
          weatherUpdates = {
            weatherSnapshot: null,
            recentWeather: { note: 'Weather unavailable' }
          }
          setWeatherDraft(null)
          setRecentWeatherDraft(weatherUpdates.recentWeather)
        }
      }
      await actions.updateForagingSession(session.id, {
        location: savedLocation,
        ...weatherUpdates
      })
      setLocationDraft(savedLocation)
      setLocationMessage('Location and weather saved.')
      setWeatherMessage(
        weatherUpdates.weatherSnapshot ? 'Weather refreshed from the saved location.' : 'Weather unavailable for this location.'
      )
    } catch (error) {
      console.error(error)
      setLocationMessage('Location could not be saved.')
    } finally {
      setSavingLocation(false)
    }
  }

  const handleRefreshWeather = async () => {
    const lat = locationDraft?.lat === '' ? null : Number(locationDraft?.lat)
    const lng = locationDraft?.lng === '' ? null : Number(locationDraft?.lng)
    if (lat == null || lng == null) {
      setWeatherMessage('Save a location first to refresh weather.')
      return
    }
    setRefreshingWeather(true)
    setWeatherMessage('')
    try {
      const weatherUpdates = await refreshWeatherForLocation({ lat, lng })
      await actions.updateForagingSession(session.id, weatherUpdates)
      setWeatherMessage('Weather refreshed.')
    } catch (error) {
      console.error(error)
      setWeatherMessage('Weather could not be refreshed.')
    } finally {
      setRefreshingWeather(false)
    }
  }

  const handleDeleteSession = async () => {
    setConfirmState({
      title: 'Delete Session',
      message: 'Delete this foraging session and all mushroom finds in it? This cannot be undone.',
      confirmLabel: 'Delete Session',
      onConfirm: async () => {
        const photosToDelete = finds.flatMap((find) => find.photos || [])
        await actions.deleteForagingSession(session.id)
        if (photosToDelete.length) {
          try {
            await deleteEntryPhotos(null, photosToDelete)
          } catch (error) {
            console.error('Cloudinary cleanup failed for session delete', error)
          }
        }
        navigate('/forager')
      }
    })
  }

  const handleDeleteFind = async (findId) => {
    setConfirmState({
      title: 'Delete Mushroom Find',
      message: 'Delete this mushroom find? This removes its notes, location, and photos from the session view.',
      confirmLabel: 'Delete Find',
      onConfirm: async () => {
        const photoObjects = finds.find((find) => find.id === findId)?.photos || []
        await actions.deleteForagingFind(findId)
        if (photoObjects.length) {
          try {
            await deleteEntryPhotos(null, photoObjects)
          } catch (error) {
            console.error('Cloudinary cleanup failed for find delete', error)
          }
        }
        if (finds.length <= 1) {
          await actions.updateForagingSession(session.id, { outcome: 'no-finds' })
        }
      }
    })
  }

  const startNewFind = (mode = 'quick') => {
    setDraftFind(buildInitialFind({ id: uid('foraging_find') }, session))
    setAddFindMode(mode)
    setAddFindOpen(true)
  }

  const handleSaveFind = async () => {
    if (!draftFind) return
    setSavingFind(true)
    try {
      const payload = {
        ...draftFind,
        id: draftFind.id || uid('foraging_find'),
        sessionId: session.id,
        observedAt: draftFind.observedAt || session.startedAt,
        species: {
          commonName: draftFind.species?.commonName || null,
          latinName: draftFind.species?.latinName || null,
          matchedPresetKey: draftFind.species?.matchedPresetKey || null,
          taxonId: draftFind.species?.taxonId || null,
          matchSource: draftFind.species?.matchSource || 'manual'
        },
        location: {
          ...(draftFind.location || {}),
          lat:
            draftFind.location?.derivedFromSession !== false
              ? session.location?.lat ?? null
              : draftFind.location?.lat === '' || draftFind.location?.lat == null
                ? null
                : Number(draftFind.location.lat),
          lng:
            draftFind.location?.derivedFromSession !== false
              ? session.location?.lng ?? null
              : draftFind.location?.lng === '' || draftFind.location?.lng == null
                ? null
                : Number(draftFind.location.lng),
          placeLabel:
            draftFind.location?.derivedFromSession !== false
              ? session.location?.placeLabel || ''
              : draftFind.location?.placeLabel || '',
          accuracyMeters:
            draftFind.location?.derivedFromSession !== false
              ? session.location?.accuracyMeters ?? null
              : draftFind.location?.accuracyMeters ?? null,
          derivedFromSession: draftFind.location?.derivedFromSession !== false
        },
        weatherSnapshot: { inheritedFromSession: true },
        photos: draftFind.photos || [],
        externalLinks: buildForagerExternalLinks({
          commonName: draftFind.species?.commonName,
          latinName: draftFind.species?.latinName,
          taxonId: draftFind.species?.taxonId,
          placeLabel:
            draftFind.location?.derivedFromSession !== false
              ? session.location?.placeLabel || ''
              : draftFind.location?.placeLabel || '',
          observedAt: draftFind.observedAt || session.startedAt
        })
      }
      await actions.addForagingFind(payload)
      await actions.updateForagingSession(session.id, {
        outcome: 'finds'
      })
      setAddFindOpen(false)
      setAddFindMode('')
      setDraftFind(null)
    } finally {
      setSavingFind(false)
    }
  }

  const startEditingFind = (find) => {
    setEditingFindId(find.id)
    setEditingFindOriginal(find)
    setEditingFindDraft(buildInitialFind(find, session))
  }

  const handleSaveEditedFind = async () => {
    if (!editingFindDraft || !editingFindId) return
    setSavingEditedFind(true)
    try {
      const payload = {
        ...editingFindDraft,
        observedAt: editingFindDraft.observedAt || session.startedAt,
        species: {
          commonName: editingFindDraft.species?.commonName || null,
          latinName: editingFindDraft.species?.latinName || null,
          matchedPresetKey: editingFindDraft.species?.matchedPresetKey || null,
          taxonId: editingFindDraft.species?.taxonId || null,
          matchSource: editingFindDraft.species?.matchSource || 'manual'
        },
        location: {
          ...(editingFindDraft.location || {}),
          lat:
            editingFindDraft.location?.derivedFromSession !== false
              ? session.location?.lat ?? null
              : editingFindDraft.location?.lat === '' || editingFindDraft.location?.lat == null
                ? null
                : Number(editingFindDraft.location.lat),
          lng:
            editingFindDraft.location?.derivedFromSession !== false
              ? session.location?.lng ?? null
              : editingFindDraft.location?.lng === '' || editingFindDraft.location?.lng == null
                ? null
                : Number(editingFindDraft.location.lng),
          placeLabel:
            editingFindDraft.location?.derivedFromSession !== false
              ? session.location?.placeLabel || ''
              : editingFindDraft.location?.placeLabel || '',
          accuracyMeters:
            editingFindDraft.location?.derivedFromSession !== false
              ? session.location?.accuracyMeters ?? null
              : editingFindDraft.location?.accuracyMeters ?? null,
          derivedFromSession: editingFindDraft.location?.derivedFromSession !== false
        },
        weatherSnapshot: { inheritedFromSession: true },
        photos: editingFindDraft.photos || [],
        externalLinks: buildForagerExternalLinks({
          commonName: editingFindDraft.species?.commonName,
          latinName: editingFindDraft.species?.latinName,
          taxonId: editingFindDraft.species?.taxonId,
          placeLabel:
            editingFindDraft.location?.derivedFromSession !== false
              ? session.location?.placeLabel || ''
              : editingFindDraft.location?.placeLabel || '',
          observedAt: editingFindDraft.observedAt || session.startedAt
        })
      }
      await actions.updateForagingFind(editingFindId, payload)
      const removedPhotos = (editingFindOriginal?.photos || []).filter(
        (photo) => !payload.photos.some((current) => current.id === photo.id)
      )
      if (removedPhotos.length) {
        try {
          await deleteEntryPhotos(null, removedPhotos)
        } catch (error) {
          console.error('Cloudinary cleanup failed for edited find', error)
        }
      }
      setEditingFindId('')
      setEditingFindDraft(null)
      setEditingFindOriginal(null)
    } finally {
      setSavingEditedFind(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{session.title || 'Foraging Session'}</h1>
          <p className="muted">
            {formatDateTime(session.startedAt)} · {formatApproximateLocation(session.location, true)}
          </p>
        </div>
        <div className="header-actions">
          <button className="secondary-btn" type="button" onClick={() => setEditOpen(true)}>
            Edit Session
          </button>
          {session.status !== 'complete' ? (
            <button className="ghost-btn" type="button" onClick={() => actions.completeForagingSession(session.id)}>
              Complete Session
            </button>
          ) : null}
          <button className="ghost-btn danger-btn" type="button" onClick={handleDeleteSession}>
            Delete Session
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="section-header">
          <h3>Mushroom Finds</h3>
          <button className="primary-btn" type="button" onClick={() => startNewFind('quick')}>
            + Add Mushroom Find
          </button>
        </div>
        {addFindOpen ? (
          <div className="forager-find-creator">
            <div className="forager-find-creator__modes">
              <button
                className={`segmented-btn ${addFindMode === 'quick' ? 'is-active' : ''}`}
                type="button"
                onClick={() => setAddFindMode('quick')}
              >
                Quick Log
              </button>
              <button
                className={`segmented-btn ${addFindMode === 'detailed' ? 'is-active' : ''}`}
                type="button"
                onClick={() => setAddFindMode('detailed')}
              >
                Detailed Log
              </button>
            </div>
            <ForagingFindForm
              value={draftFind}
              session={session}
              userId={user?.uid}
              aliasSettings={aliasSettings}
              onChange={setDraftFind}
              onRemove={() => {
                setAddFindOpen(false)
                setAddFindMode('')
                setDraftFind(null)
              }}
              showRemoveButton={false}
              mode={addFindMode || 'quick'}
            />
            <div className="forager-find-creator__actions">
              <button className="ghost-btn" type="button" onClick={() => {
                setAddFindOpen(false)
                setAddFindMode('')
                setDraftFind(null)
              }}>
                Cancel
              </button>
              <button className="primary-btn" type="button" onClick={handleSaveFind} disabled={savingFind}>
                {savingFind ? 'Saving...' : 'Save Mushroom Find'}
              </button>
            </div>
          </div>
        ) : null}
        <div className="forager-find-list">
          {finds.length ? (
            finds.map((find) => (
              <article key={find.id} id={`find-${find.id}`} className="panel">
                <div className="section-header">
                  <div>
                    <h3>{find.species?.commonName || find.species?.latinName || 'Unknown find'}</h3>
                    <p className="muted">
                      {find.species?.latinName || 'No Latin name'} · {formatDateTime(find.observedAt)}
                    </p>
                  </div>
                  <div className="grow-card-actions">
                    {find.externalLinks?.wikipediaUrl ? (
                      <a className="ghost-btn" href={find.externalLinks.wikipediaUrl} target="_blank" rel="noreferrer">
                        More Info
                      </a>
                    ) : null}
                    <button className="ghost-btn" type="button" onClick={() => startEditingFind(find)}>
                      Edit Find
                    </button>
                    {find.externalLinks?.iNaturalistTaxonUrl || find.externalLinks?.iNaturalistSearchUrl ? (
                      <a
                        className="ghost-btn"
                        href={find.externalLinks?.iNaturalistTaxonUrl || find.externalLinks?.iNaturalistSearchUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in iNaturalist
                      </a>
                    ) : null}
                    <button className="ghost-btn danger-btn" type="button" onClick={() => handleDeleteFind(find.id)}>
                      Delete Find
                    </button>
                  </div>
                </div>
                <div className="timeline-highlights">
                  {find.quantity ? <span className="timeline-pill">{find.quantity}</span> : null}
                  {find.habitat ? <span className="timeline-pill">{find.habitat}</span> : null}
                  {find.substrate ? <span className="timeline-pill">{find.substrate}</span> : null}
                  <span className="timeline-pill">{formatApproximateLocation(find.location, true)}</span>
                </div>
                <p className="muted">{find.notes || 'No notes'}</p>
                {find.photos?.length ? (
                  <div className="timeline-photo-strip">
                    {find.photos.map((photo) => (
                      <img key={photo.id || photo.url} src={photo.url} alt={find.species?.commonName || 'Foraged mushroom'} />
                    ))}
                  </div>
              ) : null}
            </article>
          ))
          ) : null}
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <h3>Session Overview</h3>
          <div className="detail-row"><span className="label">Outcome</span><span>{session.outcome}</span></div>
          <div className="detail-row"><span className="label">Notes</span><span>{session.notes || '—'}</span></div>
          <div className="detail-row"><span className="label">Recent Weather</span><span>{effectiveRecentWeather?.note || '—'}</span></div>
        </div>
        <div className="panel">
          <div className="section-header">
            <h3>Weather Snapshot</h3>
            <button className="ghost-btn" type="button" onClick={handleRefreshWeather} disabled={refreshingWeather}>
              {refreshingWeather ? 'Refreshing...' : 'Refresh Weather'}
            </button>
          </div>
          {effectiveWeather ? (
            <>
              {weatherAssessment ? (
                <div className={`forager-weather-score forager-weather-score--${weatherAssessment.rating.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div>
                    <span className="label">Mushroom Forecast</span>
                    <strong>{formatMushroomForecastLabel(weatherAssessment.rating)}</strong>
                    <p className="muted">{weatherAssessment.note}</p>
                  </div>
                  <span className="forager-weather-score__value">{weatherAssessment.score}/4 checks</span>
                </div>
              ) : null}
              <div className="forager-weather-card">
                <WeatherMetric icon="T" label="Temp" value={formatTemperatureF(effectiveWeather.temperatureC)} />
                <WeatherMetric icon="F" label="Feels Like" value={formatTemperatureF(effectiveWeather.apparentTemperatureC)} />
                <WeatherMetric icon="H" label="Humidity" value={`${effectiveWeather.humidity ?? '—'}%`} />
                <WeatherMetric icon="W" label="Wind" value={`${effectiveWeather.windSpeedKph ?? '—'} kph`} />
                <WeatherMetric icon="R" label="Rain 72h" value={formatRainMm(effectiveRecentWeather?.rainLast72hMm)} />
              </div>
              {weatherAssessment ? (
                <div className="forager-weather-conditions">
                  {weatherAssessment.metrics.map((metric) => (
                    <div key={metric.label} className={`forager-weather-condition forager-weather-condition--${metric.state}`}>
                      <strong>{metric.label}</strong>
                      <span>{metric.detail}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted">Weather unavailable</p>
          )}
          {weatherMessage ? <p className="muted">{weatherMessage}</p> : null}
        </div>
      </div>

      <div className="panel">
        <div className="section-header">
          <h3>Location</h3>
          <div className="grow-card-actions">
            <button className="ghost-btn" type="button" onClick={handleUseMyLocation} disabled={locating}>
              {locating ? 'Locating...' : 'Use My Location'}
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={handleSaveLocation}
              disabled={!hasLocationChanges || savingLocation}
            >
              {savingLocation ? 'Saving...' : 'Save Location'}
            </button>
          </div>
        </div>
        <div className="forager-location-meta">
          <span>{locationDraft?.placeLabel || 'Tap the map or use your current location'}</span>
          <span>
            {locationDraft?.lat !== '' && locationDraft?.lng !== ''
              ? `${Number(locationDraft?.lat).toFixed(5)}, ${Number(locationDraft?.lng).toFixed(5)}`
              : 'No coordinates yet'}
          </span>
        </div>
        {locationDraft?.accuracyMeters != null ? (
          <p className="muted">GPS accuracy: {Math.round(locationDraft.accuracyMeters)} m</p>
        ) : null}
        {locationMessage ? <p className="muted">{locationMessage}</p> : null}
        <LazyForagingMap
          key={
            locationDraft?.lat !== '' && locationDraft?.lng !== ''
              ? `${Number(locationDraft?.lat).toFixed(5)}:${Number(locationDraft?.lng).toFixed(5)}`
              : 'forager-session-map'
          }
          lat={locationDraft?.lat === '' ? null : locationDraft?.lat}
          lng={locationDraft?.lng === '' ? null : locationDraft?.lng}
          onChange={async ({ lat, lng }) => {
            setLocationDraft((current) => ({
              ...(current || {}),
              lat,
              lng,
              privacy: 'private-exact'
            }))
            try {
              const placeLabel = await reverseGeocode({ lat, lng })
              setLocationDraft((current) => ({
                ...(current || {}),
                lat,
                lng,
                placeLabel,
                privacy: 'private-exact'
              }))
            } catch {
              // keep coordinates even if place lookup fails
            }
          }}
          markers={finds
            .filter((find) => !find.location?.derivedFromSession)
            .map((find) => ({ id: find.id, lat: find.location?.lat, lng: find.location?.lng }))}
        />
      </div>

      <ForagingSessionForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        session={session}
        finds={finds}
      />
      <Modal
        open={Boolean(editingFindId && editingFindDraft)}
        onClose={() => {
          setEditingFindId('')
          setEditingFindDraft(null)
          setEditingFindOriginal(null)
        }}
        title="Edit Mushroom Find"
        footer={
          <>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setEditingFindId('')
                setEditingFindDraft(null)
                setEditingFindOriginal(null)
              }}
              disabled={savingEditedFind}
            >
              Cancel
            </button>
            <button className="primary-btn" type="button" onClick={handleSaveEditedFind} disabled={savingEditedFind}>
              {savingEditedFind ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editingFindDraft ? (
          <ForagingFindForm
            value={editingFindDraft}
            session={session}
            userId={user?.uid}
            aliasSettings={aliasSettings}
            onChange={setEditingFindDraft}
            onRemove={() => {}}
            showRemoveButton={false}
            mode="detailed"
          />
        ) : null}
      </Modal>
      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        onCancel={() => {
          if (confirmBusy) return
          setConfirmState(null)
        }}
        onConfirm={async () => {
          if (!confirmState?.onConfirm) return
          setConfirmBusy(true)
          try {
            await confirmState.onConfirm()
            setConfirmState(null)
          } finally {
            setConfirmBusy(false)
          }
        }}
        busy={confirmBusy}
      />
    </div>
  )
}
