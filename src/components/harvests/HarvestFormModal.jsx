import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { useStore } from '../../store/store.jsx'
import { useAuth } from '../../store/auth.jsx'
import { fromInputDate, toInputDate } from '../../utils/date.js'
import { deleteEntryPhotos, uploadEntryPhotos } from '../../utils/photos.js'
import { uid } from '../../utils/id.js'

const qualityOptions = ['A', 'B', 'C']

function buildFormState(initialHarvest) {
  return {
    date: toInputDate(initialHarvest?.date || new Date().toISOString()),
    flushNumber: initialHarvest?.flushNumber ?? 1,
    weight: initialHarvest?.weight ?? '',
    quality: initialHarvest?.quality ?? 'A',
    notes: initialHarvest?.notes ?? ''
  }
}

export default function HarvestFormModal({ open, onClose, growId, initialHarvest = null }) {
  const { actions } = useStore()
  const { user } = useAuth()
  const [form, setForm] = useState(buildFormState(initialHarvest))
  const [existingPhotos, setExistingPhotos] = useState(initialHarvest?.photos || [])
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(buildFormState(initialHarvest))
      setExistingPhotos(initialHarvest?.photos || [])
      setPhotoFiles([])
      setSubmitError('')
    }
  }, [open, initialHarvest])

  useEffect(() => {
    const nextPreviews = photoFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file)
    }))
    setPhotoPreviews(nextPreviews)
    return () => nextPreviews.forEach((item) => URL.revokeObjectURL(item.url))
  }, [photoFiles])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!growId) return
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const entryId = initialHarvest?.id || uid('harvest')
      const uploadedPhotos =
        user && photoFiles.length
          ? await uploadEntryPhotos({
              userId: user.uid,
              entryType: 'harvests',
              entryId,
              files: photoFiles
            })
          : []
      const photos = [...existingPhotos, ...uploadedPhotos]
      const payload = {
        growId,
        date: fromInputDate(form.date),
        flushNumber: Number(form.flushNumber),
        weight: form.weight === '' ? null : Number(form.weight),
        quality: form.quality,
        notes: form.notes,
        photos
      }

      if (initialHarvest?.id) {
        await actions.updateHarvest(initialHarvest.id, payload)
        if (user) {
          const removedPaths = (initialHarvest.photos || [])
            .filter((photo) => !existingPhotos.some((current) => current.id === photo.id))
            .map((photo) => photo.path)
          await deleteEntryPhotos(null, removedPaths)
        }
      } else {
        await actions.addHarvest({
          id: entryId,
          ...payload
        })
      }

      onClose()
    } catch (error) {
      console.error(error)
      setSubmitError('Harvest photo upload failed. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialHarvest ? 'Edit Harvest' : 'Add Harvest'}
      footer={
        <button className="primary-btn" type="submit" form="harvest-form" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialHarvest ? 'Save Changes' : 'Save Harvest'}
        </button>
      }
    >
      <form id="harvest-form" className="form-grid" onSubmit={handleSubmit}>
        <label>
          Harvest Date
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
        </label>
        <label>
          Flush #
          <input
            type="number"
            min="1"
            value={form.flushNumber}
            onChange={(event) => setForm({ ...form, flushNumber: event.target.value })}
            required
          />
        </label>
        <label>
          Weight (lbs)
          <input
            type="number"
            step="0.1"
            placeholder="1.2"
            value={form.weight}
            onChange={(event) => setForm({ ...form, weight: event.target.value })}
          />
        </label>
        <label>
          Quality
          <select
            value={form.quality}
            onChange={(event) => setForm({ ...form, quality: event.target.value })}
          >
            {qualityOptions.map((quality) => (
              <option key={quality} value={quality}>
                {quality}
              </option>
            ))}
          </select>
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
          Harvest Photos
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))}
          />
          <span className="helper-text">Photos are compressed automatically before upload.</span>
        </label>
        {existingPhotos.length ? (
          <div className="photo-preview-grid full-width">
            {existingPhotos.map((photo) => (
              <div key={photo.id || photo.url} className="photo-preview-card">
                <img src={photo.url} alt="Existing harvest" />
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
                <img src={preview.url} alt={`Harvest preview ${index + 1}`} />
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
