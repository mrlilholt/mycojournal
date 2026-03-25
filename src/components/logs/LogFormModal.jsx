import { useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { useStore } from '../../store/store.jsx'
import { useAuth } from '../../store/auth.jsx'
import { fromInputDateTime, toInputDateTime } from '../../utils/date.js'
import { deleteEntryPhotos, uploadEntryPhotos } from '../../utils/photos.js'
import { uid } from '../../utils/id.js'
import { parseTemp, formatTemp, toC } from '../../utils/units.js'

function buildFormState(log, growId, grow, latestLog) {
  if (log) {
    return {
      growId: log.growId || growId || '',
      timestamp: toInputDateTime(log.timestamp || new Date().toISOString()),
      temp: log.temp ?? '',
      humidity: log.humidity ?? '',
      co2: log.co2 ?? '',
      fae: log.fae ?? '',
      lightHours: log.lightHours ?? '',
      block: log.block ?? '',
      treatment: log.treatment ?? '',
      growthMmPerDay: log.growthMmPerDay ?? '',
      flushHeightMm: log.flushHeightMm ?? '',
      notes: log.notes ?? ''
    }
  }

  const defaultTemp =
    grow?.targets?.tempMin != null && grow?.targets?.tempMax != null
      ? Math.round(((grow.targets.tempMin + grow.targets.tempMax) / 2) * 10) / 10
      : ''
  const defaultHumidity =
    grow?.targets?.humidityMin != null && grow?.targets?.humidityMax != null
      ? Math.round((grow.targets.humidityMin + grow.targets.humidityMax) / 2)
      : ''
  const defaultCo2 = grow?.targets?.co2Max ?? ''

  return {
    growId: growId || '',
    timestamp: toInputDateTime(new Date().toISOString()),
    temp: defaultTemp,
    humidity: defaultHumidity,
    co2: defaultCo2,
    fae: '',
    lightHours: '',
    block: latestLog?.block ?? '',
    treatment: latestLog?.treatment ?? '',
    growthMmPerDay: '',
    flushHeightMm: '',
    notes: ''
  }
}

export default function LogFormModal({ open, onClose, growId, growOptions, initialLog = null }) {
  const { state, actions } = useStore()
  const { user } = useAuth()
  const [form, setForm] = useState(buildFormState(initialLog, growId, null, null))
  const selectedGrowId = form.growId || initialLog?.growId || growId
  const currentGrow = growOptions.find((grow) => grow.id === selectedGrowId)
  const latestLog = state.logs
    .filter((log) => log.growId === selectedGrowId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
  const [existingPhotos, setExistingPhotos] = useState(initialLog?.photos || [])
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(buildFormState(initialLog, growId, currentGrow, latestLog))
      setExistingPhotos(initialLog?.photos || [])
      setPhotoFiles([])
      setSubmitError('')
    }
  }, [open, growId, initialLog, currentGrow, latestLog])

  useEffect(() => {
    const nextPreviews = photoFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file)
    }))
    setPhotoPreviews(nextPreviews)
    return () => nextPreviews.forEach((item) => URL.revokeObjectURL(item.url))
  }, [photoFiles])

  const unitLabel = state.settings.units
  const tempHint = form.temp
    ? formatTemp(parseTemp(form.temp, unitLabel), unitLabel)
    : `Target in °${unitLabel}`

  const growChoices = useMemo(
    () => growOptions.filter((grow) => grow.status === 'active' || grow.id === growId),
    [growOptions, growId]
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.growId) return
    setIsSubmitting(true)
    setSubmitError('')
    const payload = {
      growId: form.growId,
      timestamp: fromInputDateTime(form.timestamp),
      temp: form.temp === '' ? null : parseTemp(form.temp, unitLabel),
      humidity: form.humidity === '' ? null : Number(form.humidity),
      co2: form.co2 === '' ? null : Number(form.co2),
      fae: form.fae === '' ? null : Number(form.fae),
      lightHours: form.lightHours === '' ? null : Number(form.lightHours),
      block: form.block || null,
      treatment: form.treatment || null,
      growthMmPerDay: form.growthMmPerDay === '' ? null : Number(form.growthMmPerDay),
      flushHeightMm: form.flushHeightMm === '' ? null : Number(form.flushHeightMm),
      notes: form.notes
    }
    try {
      const entryId = initialLog?.id || uid('log')
      const uploadedPhotos =
        user && photoFiles.length
          ? await uploadEntryPhotos({
              userId: user.uid,
              entryType: 'logs',
              entryId,
              files: photoFiles
            })
          : []
      const photos = [...existingPhotos, ...uploadedPhotos]

      if (initialLog?.id) {
        await actions.updateLog(initialLog.id, { ...payload, photos })
        if (user) {
          const removedPaths = (initialLog.photos || [])
            .filter((photo) => !existingPhotos.some((current) => current.id === photo.id))
            .map((photo) => photo.path)
          await deleteEntryPhotos(null, removedPaths)
        }
      } else {
        await actions.addLog({ id: entryId, ...payload, photos })
      }
      onClose()
    } catch (error) {
      console.error(error)
      setSubmitError('Saving the log photos failed. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const tempPlaceholder = unitLabel === 'C' ? Math.round(toC(70)) : 70

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialLog ? 'Edit Log Entry' : 'Add Log Entry'}
      footer={
        <button className="primary-btn" type="submit" form="log-form" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialLog ? 'Save Changes' : 'Save Log'}
        </button>
      }
    >
      <form id="log-form" className="form-grid" onSubmit={handleSubmit}>
        <label>
          Grow Run
          <select
            value={form.growId}
            onChange={(event) => {
              const nextGrowId = event.target.value
              const nextGrow = growOptions.find((grow) => grow.id === nextGrowId)
              const nextLatestLog = state.logs
                .filter((log) => log.growId === nextGrowId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
              setForm((currentForm) => ({
                ...buildFormState(initialLog, nextGrowId, nextGrow, nextLatestLog),
                timestamp: currentForm.timestamp
              }))
            }}
            required
          >
            <option value="">Select grow</option>
            {growChoices.map((grow) => (
              <option key={grow.id} value={grow.id}>
                {grow.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Timestamp
          <input
            type="datetime-local"
            value={form.timestamp}
            readOnly
            required
          />
          <span className="helper-text">Captured automatically when the log is opened.</span>
        </label>
        <label>
          Temp (°{unitLabel})
          <input
            type="number"
            step="0.1"
            placeholder={`${tempPlaceholder}`}
            value={form.temp}
            onChange={(event) => setForm({ ...form, temp: event.target.value })}
          />
          <span className="helper-text">{tempHint}</span>
        </label>
        <label>
          Humidity (%)
          <input
            type="number"
            step="1"
            placeholder="90"
            value={form.humidity}
            onChange={(event) => setForm({ ...form, humidity: event.target.value })}
          />
        </label>
        <label>
          CO2 (ppm)
          <input
            type="number"
            step="1"
            placeholder="1000"
            value={form.co2}
            onChange={(event) => setForm({ ...form, co2: event.target.value })}
          />
        </label>
        <label>
          FAE (exchanges/day)
          <input
            type="number"
            step="1"
            placeholder="6"
            value={form.fae}
            onChange={(event) => setForm({ ...form, fae: event.target.value })}
          />
        </label>
        <label>
          Light Hours
          <input
            type="number"
            step="0.5"
            placeholder="12"
            value={form.lightHours}
            onChange={(event) => setForm({ ...form, lightHours: event.target.value })}
          />
        </label>
        <label>
          Block
          <input
            type="text"
            placeholder="A"
            value={form.block}
            onChange={(event) => setForm({ ...form, block: event.target.value })}
          />
        </label>
        <label>
          Treatment
          <input
            type="text"
            placeholder="4 hr"
            value={form.treatment}
            onChange={(event) => setForm({ ...form, treatment: event.target.value })}
          />
        </label>
        <label>
          Growth (mm/day)
          <input
            type="number"
            step="0.1"
            placeholder="0"
            value={form.growthMmPerDay}
            onChange={(event) => setForm({ ...form, growthMmPerDay: event.target.value })}
          />
        </label>
        <label>
          Flush Height (mm)
          <input
            type="number"
            step="0.1"
            placeholder="0"
            value={form.flushHeightMm}
            onChange={(event) => setForm({ ...form, flushHeightMm: event.target.value })}
          />
        </label>
        <label className="full-width">
          Notes
          <textarea
            rows="3"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </label>
        <label className="full-width">
          Photos
          <label className="file-picker">
            <span className="file-picker__button">Choose Photos</span>
            <span className="file-picker__name">
              {photoFiles.length ? `${photoFiles.length} selected` : 'No files chosen'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))}
            />
          </label>
          <span className="helper-text">Photos are compressed automatically before upload.</span>
        </label>
        {existingPhotos.length ? (
          <div className="photo-preview-grid full-width">
            {existingPhotos.map((photo) => (
              <div key={photo.id || photo.url} className="photo-preview-card">
                <img src={photo.url} alt="Existing log" />
                <button
                  className="ghost-btn photo-preview-remove"
                  type="button"
                  onClick={() =>
                    setExistingPhotos((current) =>
                      current.filter((item) => (item.id || item.url) !== (photo.id || photo.url))
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {photoPreviews.length ? (
          <div className="photo-preview-grid full-width">
            {photoPreviews.map((preview, index) => (
              <div key={preview.key} className="photo-preview-card">
                <img src={preview.url} alt={`New log preview ${index + 1}`} />
                <button
                  className="ghost-btn photo-preview-remove"
                  type="button"
                  onClick={() =>
                    setPhotoFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {submitError ? <div className="form-error full-width">{submitError}</div> : null}
      </form>
    </Modal>
  )
}
