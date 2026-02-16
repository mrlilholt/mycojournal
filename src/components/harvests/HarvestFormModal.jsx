import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { useStore } from '../../store/store.jsx'
import { fromInputDate, toInputDate } from '../../utils/date.js'

const qualityOptions = ['A', 'B', 'C']

export default function HarvestFormModal({ open, onClose, growId }) {
  const { actions } = useStore()
  const [form, setForm] = useState({
    date: toInputDate(new Date().toISOString()),
    flushNumber: 1,
    weight: '',
    quality: 'A',
    notes: ''
  })

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...prev,
        date: toInputDate(new Date().toISOString())
      }))
    }
  }, [open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!growId) return
    actions.addHarvest({
      growId,
      date: fromInputDate(form.date),
      flushNumber: Number(form.flushNumber),
      weight: form.weight === '' ? null : Number(form.weight),
      quality: form.quality,
      notes: form.notes
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Harvest"
      footer={
        <button className="primary-btn" type="submit" form="harvest-form">
          Save Harvest
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
      </form>
    </Modal>
  )
}
