import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { useStore } from '../../store/store.jsx'
import { fromInputDateTime, toInputDateTime } from '../../utils/date.js'

const eventTypes = ['mist', 'fan', 'fanning', 'adjust', 'move', 'soak', 'fork', 'contam', 'other']
const severityOptions = ['info', 'warn', 'critical']

export default function EventFormModal({ open, onClose, growId }) {
  const { actions } = useStore()
  const [form, setForm] = useState({
    timestamp: toInputDateTime(new Date().toISOString()),
    type: 'mist',
    severity: 'info',
    notes: ''
  })

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...prev,
        timestamp: toInputDateTime(new Date().toISOString())
      }))
    }
  }, [open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!growId) return
    actions.addEvent({
      growId,
      timestamp: fromInputDateTime(form.timestamp),
      type: form.type,
      severity: form.severity,
      notes: form.notes
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Event"
      footer={
        <button className="primary-btn" type="submit" form="event-form">
          Save Event
        </button>
      }
    >
      <form id="event-form" className="form-grid" onSubmit={handleSubmit}>
        <label>
          Timestamp
          <input
            type="datetime-local"
            value={form.timestamp}
            onChange={(event) => setForm({ ...form, timestamp: event.target.value })}
            required
          />
        </label>
        <label>
          Type
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select
            value={form.severity}
            onChange={(event) => setForm({ ...form, severity: event.target.value })}
          >
            {severityOptions.map((level) => (
              <option key={level} value={level}>
                {level}
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
