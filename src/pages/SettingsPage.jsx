import { useEffect, useState } from 'react'
import { useStore } from '../store/store.jsx'
import { exportState, importState } from '../utils/storage.js'
import { downloadText } from '../utils/export.js'
import { parseTemp, toC } from '../utils/units.js'
import { buildStateFromCsv } from '../utils/csvImport.js'

export default function SettingsPage() {
  const { state, actions } = useStore()
  const unitLabel = state.settings.units
  const [importStatus, setImportStatus] = useState('')

  const displayTemp = (value) => {
    if (value == null || value === '') return ''
    return unitLabel === 'C' ? Math.round(toC(value) * 10) / 10 : value
  }

  const [defaults, setDefaults] = useState({
    tempMin: displayTemp(state.settings.defaultTargets?.tempMin),
    tempMax: displayTemp(state.settings.defaultTargets?.tempMax),
    humidityMin: state.settings.defaultTargets?.humidityMin ?? '',
    humidityMax: state.settings.defaultTargets?.humidityMax ?? '',
    co2Max: state.settings.defaultTargets?.co2Max ?? ''
  })

  const [weights, setWeights] = useState({
    recency: state.settings.healthWeights?.recency ?? 20,
    range: state.settings.healthWeights?.range ?? 40,
    co2: state.settings.healthWeights?.co2 ?? 15,
    contam: state.settings.healthWeights?.contam ?? 25,
    recencyDays: state.settings.recencyDays ?? 3
  })

  useEffect(() => {
    setDefaults({
      tempMin: displayTemp(state.settings.defaultTargets?.tempMin),
      tempMax: displayTemp(state.settings.defaultTargets?.tempMax),
      humidityMin: state.settings.defaultTargets?.humidityMin ?? '',
      humidityMax: state.settings.defaultTargets?.humidityMax ?? '',
      co2Max: state.settings.defaultTargets?.co2Max ?? ''
    })
  }, [state.settings.defaultTargets, unitLabel])

  useEffect(() => {
    setWeights({
      recency: state.settings.healthWeights?.recency ?? 20,
      range: state.settings.healthWeights?.range ?? 40,
      co2: state.settings.healthWeights?.co2 ?? 15,
      contam: state.settings.healthWeights?.contam ?? 25,
      recencyDays: state.settings.recencyDays ?? 3
    })
  }, [state.settings.healthWeights, state.settings.recencyDays])

  const handleDefaultsSave = () => {
    actions.updateSettings({
      defaultTargets: {
        tempMin: defaults.tempMin === '' ? null : parseTemp(defaults.tempMin, unitLabel),
        tempMax: defaults.tempMax === '' ? null : parseTemp(defaults.tempMax, unitLabel),
        humidityMin: defaults.humidityMin === '' ? null : Number(defaults.humidityMin),
        humidityMax: defaults.humidityMax === '' ? null : Number(defaults.humidityMax),
        co2Max: defaults.co2Max === '' ? null : Number(defaults.co2Max)
      }
    })
  }


  const handleWeightsSave = () => {
    actions.updateSettings({
      healthWeights: {
        recency: Number(weights.recency),
        range: Number(weights.range),
        co2: Number(weights.co2),
        contam: Number(weights.contam)
      },
      recencyDays: Number(weights.recencyDays)
    })
  }

  const handleExport = () => {
    const json = exportState(state)
    downloadText('mycojournal_backup.json', json)
  }

  const handleImport = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = importState(reader.result)
        setImportStatus(`Importing ${data.grows.length} grows and ${data.logs.length} logs...`)
        await actions.importState(data)
        setImportStatus(`Imported ${data.grows.length} grows and ${data.logs.length} logs.`)
      } catch (error) {
        console.error(error)
        setImportStatus('')
        alert('Import failed. Please check the file format.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleCsvImport = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (
      !window.confirm(
        'Importing a CSV will replace your current grows, logs, events, and harvests. Continue?'
      )
    ) {
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = buildStateFromCsv(reader.result, state)
        setImportStatus(`Importing ${data.grows.length} grows and ${data.logs.length} logs...`)
        await actions.importState(data)
        setImportStatus(`Imported ${data.grows.length} grows and ${data.logs.length} logs.`)
      } catch (error) {
        console.error(error)
        setImportStatus('')
        alert('CSV import failed. Please check the file format.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <img className="page-title-image" src="/settings.svg" alt="Settings" />
          <p className="muted">Tune defaults, health scoring, and backups.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <h3>Units</h3>
          <div className="toggle-row">
            <label className="toggle">
              <input
                type="radio"
                name="units"
                checked={unitLabel === 'F'}
                onChange={() => actions.updateSettings({ units: 'F' })}
              />
              Fahrenheit
            </label>
            <label className="toggle">
              <input
                type="radio"
                name="units"
                checked={unitLabel === 'C'}
                onChange={() => actions.updateSettings({ units: 'C' })}
              />
              Celsius
            </label>
          </div>
        </div>

        <div className="panel">
          <h3>Default Targets</h3>
          <div className="form-grid">
            <label>
              Temp Min (°{unitLabel})
              <input
                type="number"
                value={defaults.tempMin}
                onChange={(event) => setDefaults({ ...defaults, tempMin: event.target.value })}
              />
            </label>
            <label>
              Temp Max (°{unitLabel})
              <input
                type="number"
                value={defaults.tempMax}
                onChange={(event) => setDefaults({ ...defaults, tempMax: event.target.value })}
              />
            </label>
            <label>
              Humidity Min (%)
              <input
                type="number"
                value={defaults.humidityMin}
                onChange={(event) => setDefaults({ ...defaults, humidityMin: event.target.value })}
              />
            </label>
            <label>
              Humidity Max (%)
              <input
                type="number"
                value={defaults.humidityMax}
                onChange={(event) => setDefaults({ ...defaults, humidityMax: event.target.value })}
              />
            </label>
            <label>
              CO2 Max (ppm)
              <input
                type="number"
                value={defaults.co2Max}
                onChange={(event) => setDefaults({ ...defaults, co2Max: event.target.value })}
              />
            </label>
          </div>
          <button className="primary-btn" type="button" onClick={handleDefaultsSave}>
            Save Defaults
          </button>
        </div>


        <div className="panel">
          <h3>Health Score Weights</h3>
          <div className="form-grid">
            <label>
              Recency Weight
              <input
                type="number"
                value={weights.recency}
                onChange={(event) => setWeights({ ...weights, recency: event.target.value })}
              />
            </label>
            <label>
              Range Weight
              <input
                type="number"
                value={weights.range}
                onChange={(event) => setWeights({ ...weights, range: event.target.value })}
              />
            </label>
            <label>
              CO2 Weight
              <input
                type="number"
                value={weights.co2}
                onChange={(event) => setWeights({ ...weights, co2: event.target.value })}
              />
            </label>
            <label>
              Contam Weight
              <input
                type="number"
                value={weights.contam}
                onChange={(event) => setWeights({ ...weights, contam: event.target.value })}
              />
            </label>
            <label>
              Recency Days
              <input
                type="number"
                value={weights.recencyDays}
                onChange={(event) => setWeights({ ...weights, recencyDays: event.target.value })}
              />
            </label>
          </div>
          <button className="primary-btn" type="button" onClick={handleWeightsSave}>
            Save Weights
          </button>
        </div>

        <div className="panel">
          <h3>Backup</h3>
          <div className="backup-actions">
            <button className="secondary-btn" type="button" onClick={handleExport}>
              Export JSON
            </button>
            <label className="file-input">
              Import JSON
              <input type="file" accept="application/json" onChange={handleImport} />
            </label>
            <label className="file-input">
              Import CSV
              <input type="file" accept=".csv,text/csv" onChange={handleCsvImport} />
            </label>
          </div>
          {importStatus ? <p className="muted" style={{ marginTop: '12px' }}>{importStatus}</p> : null}
          <p className="muted" style={{ marginTop: '12px' }}>
            CSV format should include columns for Date, Species, Treatment, Block, Growth, Temp (F),
            Rel_Humidity_%, CO2 (ppm), notes, and Height of flush (mm).
          </p>
        </div>
      </div>
    </div>
  )
}
