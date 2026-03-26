import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../store/auth.jsx'
import { useStore } from '../../store/store.jsx'
import { buildForagerExternalLinks } from '../../utils/foragerExternalLinks.js'
import { getCurrentPosition, reverseGeocode } from '../../utils/foragerLocation.js'
import { fetchWeatherForLocation, formatRainMm, formatTemperatureF } from '../../utils/foragerWeather.js'
import { uid } from '../../utils/id.js'
import Modal from '../ui/Modal.jsx'
import LazyForagingMap from './LazyForagingMap.jsx'
import ForagingFindForm, { buildInitialFind } from './ForagingFindForm.jsx'

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

function getDatePart(value) {
  const local = toDateTimeLocal(value)
  return local ? local.slice(0, 10) : ''
}

function getTimePart(value) {
  const local = toDateTimeLocal(value)
  return local ? local.slice(11, 16) : ''
}

function setDateTimePart(currentValue, part, nextValue) {
  const datePart = part === 'date' ? nextValue : getDatePart(currentValue)
  const timePart = part === 'time' ? nextValue : getTimePart(currentValue) || '12:00'
  if (!datePart) return ''
  return fromDateTimeLocal(`${datePart}T${timePart}`, currentValue || new Date().toISOString())
}

function buildSessionState(session = null) {
  const now = new Date().toISOString()
  return {
    title: session?.title || '',
    startedAt: session?.startedAt || now,
    endedAt: session?.endedAt || '',
    status: session?.status || 'active',
    outcome: session?.outcome || 'no-finds',
    notes: session?.notes || '',
    location: {
      lat: session?.location?.lat ?? '',
      lng: session?.location?.lng ?? '',
      accuracyMeters: session?.location?.accuracyMeters ?? null,
      placeLabel: session?.location?.placeLabel || '',
      privacy: 'private-exact'
    },
    weatherSnapshot: session?.weatherSnapshot || null,
    recentWeather: session?.recentWeather || null,
    tipsUsed: session?.tipsUsed || []
  }
}

export default function ForagingSessionForm({
  open,
  onClose,
  session = null,
  finds,
  onSaved
}) {
  const { user } = useAuth()
  const { state, actions } = useStore()
  const [form, setForm] = useState(buildSessionState(session))
  const [findForms, setFindForms] = useState([])
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [saving, setSaving] = useState(false)
  const stableFinds = useMemo(() => finds || [], [finds])
  const sessionState = useMemo(() => buildSessionState(session), [session])

  useEffect(() => {
    if (!open) return
    setForm(sessionState)
    setFindForms(
      stableFinds.length
        ? stableFinds
        : []
    )
  }, [open, session, stableFinds, sessionState])

  useEffect(() => {
    if (!open) return
    setFindForms((current) =>
      current.map((find) =>
        find.location?.derivedFromSession === false
          ? find
          : {
              ...find,
              location: {
                ...find.location,
                lat: form.location.lat,
                lng: form.location.lng,
                accuracyMeters: form.location.accuracyMeters ?? null,
                placeLabel: form.location.placeLabel || '',
                derivedFromSession: true
              }
            }
      )
    )
  }, [
    open,
    form.location.lat,
    form.location.lng,
    form.location.accuracyMeters,
    form.location.placeLabel
  ])

  const aliasSettings = state.settings.foragerSpeciesAliases || {}

  const summarySpecies = useMemo(
    () =>
      Array.from(
        new Set(
          findForms
            .map((find) => find.species?.commonName || find.species?.latinName)
            .filter(Boolean)
        )
      ),
    [findForms]
  )

  const refreshWeather = async (coords = form.location) => {
    if (coords.lat === '' || coords.lng === '') return
    setLoadingWeather(true)
    try {
      const weather = await fetchWeatherForLocation({
        lat: Number(coords.lat),
        lng: Number(coords.lng),
        at: form.startedAt
      })
      setForm((current) => ({ ...current, ...weather }))
    } catch (error) {
      console.warn('Weather unavailable', error)
      setForm((current) => ({ ...current, weatherSnapshot: null, recentWeather: { note: 'Weather unavailable' } }))
    } finally {
      setLoadingWeather(false)
    }
  }

  const useCurrentLocation = async () => {
    setLoadingLocation(true)
    try {
      const coords = await getCurrentPosition()
      let placeLabel = ''
      try {
        placeLabel = await reverseGeocode(coords)
      } catch {
        // non-blocking
      }
      const nextLocation = { ...coords, placeLabel, privacy: 'private-exact' }
      setForm((current) => ({ ...current, location: nextLocation }))
      await refreshWeather(nextLocation)
    } catch (error) {
      console.warn('Location unavailable', error)
    } finally {
      setLoadingLocation(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const sessionId = session?.id || uid('foraging_session')
      const payload = {
        id: sessionId,
        title: form.title || null,
        startedAt: form.startedAt,
        endedAt: form.endedAt || null,
        status: form.status,
        outcome: findForms.length ? 'finds' : 'no-finds',
        notes: form.notes,
        location: {
          lat: form.location.lat === '' ? null : Number(form.location.lat),
          lng: form.location.lng === '' ? null : Number(form.location.lng),
          accuracyMeters: form.location.accuracyMeters ?? null,
          placeLabel: form.location.placeLabel || '',
          privacy: 'private-exact'
        },
        weatherSnapshot: form.weatherSnapshot || null,
        recentWeather: form.recentWeather || null,
        tipsUsed: form.tipsUsed || []
      }

      if (session?.id) {
        await actions.updateForagingSession(session.id, payload)
      } else {
        await actions.addForagingSession(payload)
      }

      if (session?.id) {
        const existingIds = new Set(stableFinds.map((find) => find.id))
        const nextIds = new Set(findForms.filter((find) => find.id).map((find) => find.id))

        for (const existing of stableFinds) {
          if (!nextIds.has(existing.id)) {
            await actions.deleteForagingFind(existing.id)
          }
        }

        for (const find of findForms) {
          const findPayload = {
            ...find,
            id: find.id || uid('foraging_find'),
            sessionId,
            observedAt: find.observedAt || form.startedAt,
            species: {
              commonName: find.species?.commonName || null,
              latinName: find.species?.latinName || null,
              matchedPresetKey: find.species?.matchedPresetKey || null,
              taxonId: find.species?.taxonId || null,
              matchSource: find.species?.matchSource || 'manual'
            },
            location: {
              ...(find.location || {}),
              lat:
                find.location?.derivedFromSession !== false
                  ? payload.location.lat
                  : find.location?.lat === '' || find.location?.lat == null
                    ? null
                    : Number(find.location.lat),
              lng:
                find.location?.derivedFromSession !== false
                  ? payload.location.lng
                  : find.location?.lng === '' || find.location?.lng == null
                    ? null
                    : Number(find.location.lng),
              placeLabel:
                find.location?.derivedFromSession !== false
                  ? payload.location.placeLabel
                  : find.location?.placeLabel || '',
              accuracyMeters:
                find.location?.derivedFromSession !== false
                  ? payload.location.accuracyMeters
                  : find.location?.accuracyMeters ?? null,
              derivedFromSession: find.location?.derivedFromSession !== false
            },
            weatherSnapshot: { inheritedFromSession: true },
            photos: find.photos || [],
            externalLinks: buildForagerExternalLinks({
              commonName: find.species?.commonName,
              latinName: find.species?.latinName,
              taxonId: find.species?.taxonId,
              placeLabel:
                find.location?.derivedFromSession !== false
                  ? payload.location.placeLabel
                  : find.location?.placeLabel || '',
              observedAt: find.observedAt || form.startedAt
            })
          }
          if (existingIds.has(findPayload.id)) {
            await actions.updateForagingFind(findPayload.id, findPayload)
          } else {
            await actions.addForagingFind(findPayload)
          }
        }
      }

      if ((state.settings.foragerPreferences?.autoCompleteSessionAfterSave || false) && !form.endedAt) {
        await actions.completeForagingSession(sessionId)
      }
      if (onSaved) onSaved(sessionId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? 'Edit Foraging Session' : 'New Foraging Session'}
      footer={
        <button className="primary-btn" type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : session ? 'Save Session' : 'Create Session'}
        </button>
      }
    >
      <div className="forager-session-form">
        <div className="panel">
          <div className="section-header">
            <h3>Session Basics</h3>
          </div>
          <div className="form-grid">
            <label>
              Title
              <input
                type="text"
                value={form.title || ''}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ridgeline Trail"
              />
            </label>
            <label>
              Session Date
              <input
                type="date"
                value={getDatePart(form.startedAt)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startedAt: setDateTimePart(current.startedAt, 'date', event.target.value)
                  }))
                }
              />
            </label>
            <label>
              Start Time
              <input
                type="time"
                value={getTimePart(form.startedAt)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startedAt: setDateTimePart(current.startedAt, 'time', event.target.value)
                  }))
                }
              />
            </label>
            <label className="full">
              Notes
              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Trail conditions, companion plants, terrain..."
              />
            </label>
          </div>
          <p className="muted">Create the session with the basics first. You can add location, weather, finds, and photos right after.</p>
          <label>
            End Time
            <input
              type="time"
              value={getTimePart(form.endedAt)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endedAt: event.target.value
                    ? setDateTimePart(current.endedAt || current.startedAt, 'time', event.target.value)
                    : ''
                }))
              }
            />
          </label>
        </div>

        {session ? (
          <>
            <div className="panel">
              <div className="section-header">
                <h3>Location</h3>
                <button className="ghost-btn" type="button" onClick={useCurrentLocation}>
                  {loadingLocation ? 'Locating...' : 'Use My Location'}
                </button>
              </div>
              <LazyForagingMap
                lat={form.location.lat === '' ? null : Number(form.location.lat)}
                lng={form.location.lng === '' ? null : Number(form.location.lng)}
                zoom={state.settings.foragerPreferences?.defaultMapZoom || 14}
                onChange={async ({ lat, lng }) => {
                  setForm((current) => ({
                    ...current,
                    location: { ...current.location, lat, lng, privacy: 'private-exact' }
                  }))
                  try {
                    const placeLabel = await reverseGeocode({ lat, lng })
                    setForm((current) => ({
                      ...current,
                      location: { ...current.location, lat, lng, placeLabel, privacy: 'private-exact' }
                    }))
                  } catch {
                    // non-blocking
                  }
                }}
              />
              <div className="forager-location-meta">
                <span>{form.location.placeLabel || 'Tap map or use current location'}</span>
                <span>
                  {form.location.lat !== '' && form.location.lng !== ''
                    ? `${Number(form.location.lat).toFixed(5)}, ${Number(form.location.lng).toFixed(5)}`
                    : 'No coordinates yet'}
                </span>
              </div>
            </div>

            <div className="panel">
              <div className="section-header">
                <h3>Weather</h3>
                <button className="ghost-btn" type="button" onClick={() => refreshWeather()}>
                  {loadingWeather ? 'Refreshing...' : 'Refresh Weather'}
                </button>
              </div>
              {form.weatherSnapshot ? (
                <div className="forager-weather-card">
                  <span><strong>Temp</strong>{formatTemperatureF(form.weatherSnapshot.temperatureC)}</span>
                  <span><strong>Feels Like</strong>{formatTemperatureF(form.weatherSnapshot.apparentTemperatureC)}</span>
                  <span><strong>Humidity</strong>{form.weatherSnapshot.humidity ?? '—'}%</span>
                  <span><strong>Wind</strong>{form.weatherSnapshot.windSpeedKph ?? '—'} kph</span>
                  <span><strong>Rain 72h</strong>{formatRainMm(form.recentWeather?.rainLast72hMm)}</span>
                </div>
              ) : (
                <p className="muted">{form.recentWeather?.note || 'Weather unavailable until a location is set.'}</p>
              )}
            </div>

            <div className="panel">
              <div className="section-header">
                <h3>Finds</h3>
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() =>
                    setFindForms((current) => [
                      ...current,
                      buildInitialFind({ id: uid('foraging_find') }, form)
                    ])
                  }
                >
                  + Add Mushroom Find
                </button>
              </div>
              {!findForms.length ? (
                <p className="muted">No finds logged yet. If you leave this empty, the session will be saved as a no-find outing.</p>
              ) : null}
              <div className="forager-session-form__finds">
                {findForms.map((find, index) => (
                  <ForagingFindForm
                    key={find.id || index}
                    value={find}
                    session={form}
                    userId={user?.uid}
                    aliasSettings={aliasSettings}
                    onChange={(nextFind) =>
                      setFindForms((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? nextFind : item))
                      )
                    }
                    onRemove={() =>
                      setFindForms((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  />
                ))}
              </div>
              {summarySpecies.length ? (
                <p className="muted">Session species: {summarySpecies.join(', ')}</p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="panel">
            <h3>Next Step</h3>
            <p className="muted">
              Create the session first. Then open it to log exact location, weather, mushroom finds, iNaturalist links, and photos.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
