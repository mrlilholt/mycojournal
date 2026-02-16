import { SPECIES_LIST, SPECIES_PRESETS } from './speciesDefaults.js'
import { simpleHash } from './id.js'

const HEADER_MAP = {
  date: 'date',
  species: 'species',
  treatment: 'treatment',
  block: 'block',
  growthmmdayfromblockoutwardsmm: 'growth',
  tempf: 'temp',
  relhumidity: 'humidity',
  co2ppm: 'co2',
  notes: 'notes',
  heightofflushmm: 'flushHeight'
}

const SPECIES_ALIASES = {
  'pleurotus citrinopileatus (golden oyster)':
    'Pleurotus citrinolileatus (Golden Oyster)'
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let current = ''
  let inQuotes = false
  const input = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
      continue
    }
    if (char === '\n' && !inQuotes) {
      row.push(current)
      rows.push(row)
      row = []
      current = ''
      continue
    }
    current += char
  }

  if (current.length || row.length) {
    row.push(current)
    rows.push(row)
  }

  return rows
}

function parseNumber(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : null
}

function parseDate(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const normalized = trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function normalizeSpecies(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  const key = trimmed.toLowerCase()
  return SPECIES_ALIASES[key] || trimmed
}

function getCommonName(species) {
  const match = species.match(/\(([^)]+)\)/)
  return match ? match[1] : species
}

export function buildStateFromCsv(text, currentState) {
  const rows = parseCsv(text).filter((row) => row.some((cell) => String(cell).trim() !== ''))
  if (rows.length < 2) {
    throw new Error('CSV has no data rows')
  }

  const headers = rows[0].map(normalizeHeader)
  const headerIndex = {}
  headers.forEach((header, index) => {
    const mapped = HEADER_MAP[header]
    if (mapped && headerIndex[mapped] == null) {
      headerIndex[mapped] = index
    }
  })

  if (headerIndex.date == null || headerIndex.species == null) {
    throw new Error('CSV headers missing Date or Species')
  }

  const growsByKey = new Map()
  const logs = []

  rows.slice(1).forEach((row, index) => {
    const cell = (key) => row[headerIndex[key]] ?? ''
    const timestamp = parseDate(cell('date'))
    const speciesRaw = cell('species')
    if (!timestamp || !speciesRaw) return

    const species = normalizeSpecies(speciesRaw)
    const block = String(cell('block') ?? '').trim()
    const treatment = String(cell('treatment') ?? '').trim()
    const growKey = `${species}::${block || 'default'}`
    let grow = growsByKey.get(growKey)
    if (!grow) {
      const preset = SPECIES_PRESETS[species]
      const growId = `grow_${simpleHash(growKey)}`
      const commonName = getCommonName(species)
      grow = {
        id: growId,
        name: block ? `${commonName} Block ${block}` : commonName,
        species,
        method: 'Block',
        substrate: '',
        startDate: timestamp,
        phase: 'Fruiting',
        status: 'active',
        targets: {
          tempMin: preset?.tempMin ?? null,
          tempMax: preset?.tempMax ?? null,
          humidityMin: preset?.humidityMin ?? null,
          humidityMax: preset?.humidityMax ?? null,
          co2Max: preset?.co2Max ?? null
        },
        tags: treatment ? [treatment] : [],
        notes: '',
        createdAt: timestamp,
        updatedAt: timestamp
      }
      growsByKey.set(growKey, grow)
    } else if (new Date(timestamp) < new Date(grow.startDate)) {
      grow.startDate = timestamp
      grow.createdAt = timestamp
    }

    logs.push({
      id: `log_${simpleHash(`${grow.id}|${timestamp}|${index}`)}`,
      growId: grow.id,
      timestamp,
      temp: parseNumber(cell('temp')),
      humidity: parseNumber(cell('humidity')),
      co2: parseNumber(cell('co2')),
      growthMmPerDay: parseNumber(cell('growth')),
      flushHeightMm: parseNumber(cell('flushHeight')),
      block: block || null,
      treatment: treatment || null,
      notes: String(cell('notes') ?? '').trim(),
      createdAt: timestamp
    })
  })

  const grows = Array.from(growsByKey.values())
  const speciesFromCsv = grows.map((grow) => grow.species)
  const speciesList = Array.from(
    new Set([...(currentState?.settings?.speciesList || []), ...SPECIES_LIST, ...speciesFromCsv])
  ).sort()
  const presets = { ...SPECIES_PRESETS, ...(currentState?.settings?.presets || {}) }
  const settings = {
    ...(currentState?.settings || {}),
    speciesList,
    presets
  }

  return {
    grows,
    logs,
    events: [],
    harvests: [],
    settings
  }
}
