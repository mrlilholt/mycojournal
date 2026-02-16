import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/store.jsx'
import { parseTemp, toC } from '../utils/units.js'
import { SPECIES_LIST, SPECIES_PRESETS } from '../utils/speciesDefaults.js'

export default function SpeciesPage() {
  const { state, actions } = useStore()
  const unitLabel = state.settings.units

  const displayTemp = (value) => {
    if (value == null || value === '') return ''
    return unitLabel === 'C' ? Math.round(toC(value) * 10) / 10 : value
  }

  const presetRowsInitial = useMemo(() => {
    return Object.entries(state.settings.presets || {}).map(([species, preset]) => ({
      species,
      tempMin: displayTemp(preset.tempMin),
      tempMax: displayTemp(preset.tempMax),
      humidityMin: preset.humidityMin ?? '',
      humidityMax: preset.humidityMax ?? '',
      co2Max: preset.co2Max ?? ''
    }))
  }, [state.settings.presets, unitLabel])

  const [presetRows, setPresetRows] = useState(presetRowsInitial)
  const [newPreset, setNewPreset] = useState({
    species: '',
    tempMin: '',
    tempMax: '',
    humidityMin: '',
    humidityMax: '',
    co2Max: ''
  })

  useEffect(() => {
    setPresetRows(presetRowsInitial)
  }, [presetRowsInitial])

  const availableSpecies = useMemo(() => {
    const list = new Set(SPECIES_LIST)
    ;(state.settings.speciesList || []).forEach((species) => list.add(species))
    state.grows.forEach((grow) => list.add(grow.species))
    Object.keys(state.settings.presets || {}).forEach((species) => list.add(species))
    return Array.from(list).filter(Boolean).sort()
  }, [state.settings.speciesList, state.grows, state.settings.presets])

  const handleSpeciesSelect = (species) => {
    const preset = state.settings.presets?.[species] || SPECIES_PRESETS[species]
    setNewPreset({
      species,
      tempMin: preset?.tempMin != null ? displayTemp(preset.tempMin) : '',
      tempMax: preset?.tempMax != null ? displayTemp(preset.tempMax) : '',
      humidityMin: preset?.humidityMin ?? '',
      humidityMax: preset?.humidityMax ?? '',
      co2Max: preset?.co2Max ?? ''
    })
  }

  const handlePresetsSave = () => {
    const presets = {}
    presetRows.forEach((row) => {
      if (!row.species) return
      presets[row.species] = {
        tempMin: row.tempMin === '' ? null : parseTemp(row.tempMin, unitLabel),
        tempMax: row.tempMax === '' ? null : parseTemp(row.tempMax, unitLabel),
        humidityMin: row.humidityMin === '' ? null : Number(row.humidityMin),
        humidityMax: row.humidityMax === '' ? null : Number(row.humidityMax),
        co2Max: row.co2Max === '' ? null : Number(row.co2Max)
      }
    })
    const nextSpecies = new Set(state.settings.speciesList || [])
    Object.keys(presets).forEach((species) => nextSpecies.add(species))
    actions.updateSettings({ presets, speciesList: Array.from(nextSpecies).sort() })
  }

  const handleAddPreset = () => {
    if (!newPreset.species) return
    const row = {
      species: newPreset.species,
      tempMin: newPreset.tempMin,
      tempMax: newPreset.tempMax,
      humidityMin: newPreset.humidityMin,
      humidityMax: newPreset.humidityMax,
      co2Max: newPreset.co2Max
    }
    setPresetRows([row, ...presetRows])
    const nextSpecies = new Set(state.settings.speciesList || [])
    nextSpecies.add(newPreset.species)
    actions.updateSettings({ speciesList: Array.from(nextSpecies).sort() })
    setNewPreset({
      species: '',
      tempMin: '',
      tempMax: '',
      humidityMin: '',
      humidityMax: '',
      co2Max: ''
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <img className="page-title-image" src="/speciesManager.svg" alt="Species Manager" />
          <p className="muted">Add species and define target presets for future grows.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <h3>Available Species</h3>
          <p className="muted">Click a species to auto-fill the preset form.</p>
          <div className="tag-pills">
            {availableSpecies.length ? (
              availableSpecies.map((species) => (
                <button
                  key={species}
                  type="button"
                  className="tag-pill tag-pill-btn"
                  onClick={() => handleSpeciesSelect(species)}
                >
                  {species}
                </button>
              ))
            ) : (
              <span className="muted">No species saved yet.</span>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="section-header">
            <h3>Species Presets</h3>
            <button
              className="ghost-btn"
              type="button"
              onClick={() =>
                setPresetRows([
                  ...presetRows,
                  { species: '', tempMin: '', tempMax: '', humidityMin: '', humidityMax: '', co2Max: '' }
                ])
              }
            >
              + Add Preset
            </button>
          </div>
          <div className="preset-list">
            <div className="preset-header">
              <span>Species</span>
              <span>Temp Min (°{unitLabel})</span>
              <span>Temp Max (°{unitLabel})</span>
              <span>Humidity Min</span>
              <span>Humidity Max</span>
              <span>CO2 Max</span>
              <span />
            </div>
            <div className="preset-row preset-row--new">
              <input
                type="text"
                placeholder="Species"
                value={newPreset.species}
                onChange={(event) => setNewPreset({ ...newPreset, species: event.target.value })}
              />
              <input
                type="number"
                placeholder={`Temp Min (°${unitLabel})`}
                value={newPreset.tempMin}
                onChange={(event) => setNewPreset({ ...newPreset, tempMin: event.target.value })}
              />
              <input
                type="number"
                placeholder={`Temp Max (°${unitLabel})`}
                value={newPreset.tempMax}
                onChange={(event) => setNewPreset({ ...newPreset, tempMax: event.target.value })}
              />
              <input
                type="number"
                placeholder="Humidity Min"
                value={newPreset.humidityMin}
                onChange={(event) => setNewPreset({ ...newPreset, humidityMin: event.target.value })}
              />
              <input
                type="number"
                placeholder="Humidity Max"
                value={newPreset.humidityMax}
                onChange={(event) => setNewPreset({ ...newPreset, humidityMax: event.target.value })}
              />
              <input
                type="number"
                placeholder="CO2 Max"
                value={newPreset.co2Max}
                onChange={(event) => setNewPreset({ ...newPreset, co2Max: event.target.value })}
              />
              <button className="secondary-btn" type="button" onClick={handleAddPreset}>
                Add
              </button>
            </div>
            {presetRows.map((row, index) => (
              <div key={`${row.species}-${index}`} className="preset-row">
                <input
                  type="text"
                  placeholder="Species"
                  value={row.species}
                  onChange={(event) => {
                    const next = [...presetRows]
                    next[index] = { ...row, species: event.target.value }
                    setPresetRows(next)
                  }}
                />
                <input
                  type="number"
                  placeholder={`Temp Min (°${unitLabel})`}
                  value={row.tempMin}
                  onChange={(event) => {
                    const next = [...presetRows]
                    next[index] = { ...row, tempMin: event.target.value }
                    setPresetRows(next)
                  }}
                />
                <input
                  type="number"
                  placeholder={`Temp Max (°${unitLabel})`}
                  value={row.tempMax}
                  onChange={(event) => {
                    const next = [...presetRows]
                    next[index] = { ...row, tempMax: event.target.value }
                    setPresetRows(next)
                  }}
                />
                <input
                  type="number"
                  placeholder="Humidity Min"
                  value={row.humidityMin}
                  onChange={(event) => {
                    const next = [...presetRows]
                    next[index] = { ...row, humidityMin: event.target.value }
                    setPresetRows(next)
                  }}
                />
                <input
                  type="number"
                  placeholder="Humidity Max"
                  value={row.humidityMax}
                  onChange={(event) => {
                    const next = [...presetRows]
                    next[index] = { ...row, humidityMax: event.target.value }
                    setPresetRows(next)
                  }}
                />
                <input
                  type="number"
                  placeholder="CO2 Max"
                  value={row.co2Max}
                  onChange={(event) => {
                    const next = [...presetRows]
                    next[index] = { ...row, co2Max: event.target.value }
                    setPresetRows(next)
                  }}
                />
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => setPresetRows(presetRows.filter((_, rowIndex) => rowIndex !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button className="primary-btn" type="button" onClick={handlePresetsSave}>
            Save Presets
          </button>
        </div>

      </div>
    </div>
  )
}
