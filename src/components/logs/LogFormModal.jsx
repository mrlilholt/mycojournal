import { useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { useStore } from '../../store/store.jsx'
import { fromInputDateTime, toInputDateTime } from '../../utils/date.js'
import { parseTemp, formatTemp, toC } from '../../utils/units.js'

const surfaceOptions = ['dry', 'ideal', 'wet']

export default function LogFormModal({ open, onClose, growId, growOptions }) {
  const { state, actions } = useStore()
  const [form, setForm] = useState({
    growId: growId || '',
    timestamp: toInputDateTime(new Date().toISOString()),
    temp: '',
    humidity: '',
    co2: '',
    fae: '',
    lightHours: '',
    surfaceCondition: 'ideal',
    block: '',
    treatment: '',
    growthMmPerDay: '',
    flushHeightMm: '',
    notes: ''
  })

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...prev,
        growId: growId || prev.growId || '',
        timestamp: toInputDateTime(new Date().toISOString())
      }))
    }
  }, [open, growId])

  const unitLabel = state.settings.units
  const tempHint = form.temp
    ? formatTemp(parseTemp(form.temp, unitLabel), unitLabel)
    : `Target in °${unitLabel}`

  const growChoices = useMemo(
    () => growOptions.filter((grow) => grow.status === 'active' || grow.id === growId),
    [growOptions, growId]
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.growId) return
    actions.addLog({
      growId: form.growId,
      timestamp: fromInputDateTime(form.timestamp),
      temp: form.temp === '' ? null : parseTemp(form.temp, unitLabel),
      humidity: form.humidity === '' ? null : Number(form.humidity),
      co2: form.co2 === '' ? null : Number(form.co2),
      fae: form.fae === '' ? null : Number(form.fae),
      lightHours: form.lightHours === '' ? null : Number(form.lightHours),
      surfaceCondition: form.surfaceCondition,
      block: form.block || null,
      treatment: form.treatment || null,
      growthMmPerDay: form.growthMmPerDay === '' ? null : Number(form.growthMmPerDay),
      flushHeightMm: form.flushHeightMm === '' ? null : Number(form.flushHeightMm),
      notes: form.notes
    })
    onClose()
  }

  const tempPlaceholder = unitLabel === 'C' ? Math.round(toC(70)) : 70

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Log Entry"
      footer={
        <button className="primary-btn" type="submit" form="log-form">
          Save Log
        </button>
      }
    >
      <form id="log-form" className="form-grid" onSubmit={handleSubmit}>
        <label>
          Grow Run
          <select
            value={form.growId}
            onChange={(event) => setForm({ ...form, growId: event.target.value })}
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
            onChange={(event) => setForm({ ...form, timestamp: event.target.value })}
            required
          />
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
          Surface Condition
          <select
            value={form.surfaceCondition}
            onChange={(event) => setForm({ ...form, surfaceCondition: event.target.value })}
          >
            {surfaceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
      </form>
    </Modal>
  )
}
