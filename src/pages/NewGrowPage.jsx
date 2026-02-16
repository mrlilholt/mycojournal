import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/store.jsx'
import { fromInputDate, toInputDate } from '../utils/date.js'
import { parseTemp, toC } from '../utils/units.js'
import { SPECIES_LIST, SPECIES_PRESETS } from '../utils/speciesDefaults.js'

const methodOptions = ['Bag', 'Monotub', 'Block', 'Log', 'Other']
const phaseOptions = ['Incubation', 'Pinning', 'Fruiting', 'Post-harvest']

export default function NewGrowPage() {
  const { state, actions } = useStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const existing = state.grows.find((grow) => grow.id === editId)

  const presets = state.settings.presets || {}
  const speciesOptions = useMemo(() => {
    const list = new Set(SPECIES_LIST)
    ;(state.settings.speciesList || []).forEach((species) => list.add(species))
    Object.keys(presets).forEach((species) => list.add(species))
    state.grows.forEach((grow) => list.add(grow.species))
    return Array.from(list).filter(Boolean).sort()
  }, [presets, state.grows, state.settings.speciesList])

  const unitLabel = state.settings.units
  const displayTemp = (value) => {
    if (value == null || value === '') return ''
    return unitLabel === 'C' ? Math.round(toC(value) * 10) / 10 : value
  }

  const [form, setForm] = useState({
    name: existing?.name || '',
    species: existing?.species || '',
    method: existing?.method || 'Bag',
    substrate: existing?.substrate || '',
    startDate: existing?.startDate ? toInputDate(existing.startDate) : toInputDate(new Date().toISOString()),
    phase: existing?.phase || 'Incubation',
    tempMin: displayTemp(existing?.targets?.tempMin ?? ''),
    tempMax: displayTemp(existing?.targets?.tempMax ?? ''),
    humidityMin: existing?.targets?.humidityMin ?? '',
    humidityMax: existing?.targets?.humidityMax ?? '',
    co2Max: existing?.targets?.co2Max ?? '',
    tags: existing?.tags?.join(', ') || ''
  })

  const handlePresetApply = () => {
    const preset = presets[form.species] || SPECIES_PRESETS[form.species]
    if (!preset) return
    setForm({
      ...form,
      tempMin: displayTemp(preset.tempMin),
      tempMax: displayTemp(preset.tempMax),
      humidityMin: preset.humidityMin,
      humidityMax: preset.humidityMax,
      co2Max: preset.co2Max
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const payload = {
      name: form.name,
      species: form.species,
      method: form.method,
      substrate: form.substrate,
      startDate: fromInputDate(form.startDate),
      phase: form.phase,
      targets: {
        tempMin: form.tempMin === '' ? null : parseTemp(form.tempMin, unitLabel),
        tempMax: form.tempMax === '' ? null : parseTemp(form.tempMax, unitLabel),
        humidityMin: form.humidityMin === '' ? null : Number(form.humidityMin),
        humidityMax: form.humidityMax === '' ? null : Number(form.humidityMax),
        co2Max: form.co2Max === '' ? null : Number(form.co2Max)
      },
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    }

    if (existing) {
      actions.updateGrow(existing.id, payload)
      navigate(`/grows/${existing.id}`)
    } else {
      actions.addGrow(payload)
      navigate('/grows')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{existing ? 'Edit Grow' : 'New Grow Run'}</h1>
          <p className="muted">Capture your grow setup and target ranges.</p>
        </div>
      </div>

      <form className="form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label>
            Species
            <input
              type="text"
              list="species-options"
              value={form.species}
              onChange={(event) => setForm({ ...form, species: event.target.value })}
              required
            />
            <datalist id="species-options">
              {speciesOptions.map((species) => (
                <option key={species} value={species} />
              ))}
            </datalist>
          </label>
          <label>
            Method
            <select
              value={form.method}
              onChange={(event) => setForm({ ...form, method: event.target.value })}
            >
              {methodOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label>
            Substrate
            <input
              type="text"
              value={form.substrate}
              onChange={(event) => setForm({ ...form, substrate: event.target.value })}
            />
          </label>
          <label>
            Inoculation Date
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              required
            />
          </label>
          <label>
            Phase
            <select value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value })}>
              {phaseOptions.map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Target Ranges</h3>
            {presets[form.species] ? (
              <button className="ghost-btn" type="button" onClick={handlePresetApply}>
                Apply {form.species} preset
              </button>
            ) : null}
          </div>
          <div className="form-grid">
            <label>
              Temp Min (°{unitLabel})
              <input
                type="number"
                step="0.1"
                value={form.tempMin}
                onChange={(event) => setForm({ ...form, tempMin: event.target.value })}
              />
            </label>
            <label>
              Temp Max (°{unitLabel})
              <input
                type="number"
                step="0.1"
                value={form.tempMax}
                onChange={(event) => setForm({ ...form, tempMax: event.target.value })}
              />
            </label>
            <label>
              Humidity Min (%)
              <input
                type="number"
                step="1"
                value={form.humidityMin}
                onChange={(event) => setForm({ ...form, humidityMin: event.target.value })}
              />
            </label>
            <label>
              Humidity Max (%)
              <input
                type="number"
                step="1"
                value={form.humidityMax}
                onChange={(event) => setForm({ ...form, humidityMax: event.target.value })}
              />
            </label>
            <label>
              CO2 Max (ppm)
              <input
                type="number"
                step="10"
                value={form.co2Max}
                onChange={(event) => setForm({ ...form, co2Max: event.target.value })}
              />
            </label>
            <label>
              Tags (comma separated)
              <input
                type="text"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button className="primary-btn" type="submit">
            {existing ? 'Save Changes' : 'Create Grow'}
          </button>
          <button className="ghost-btn" type="button" onClick={() => navigate('/grows')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
