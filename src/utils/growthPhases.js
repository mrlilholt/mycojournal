const DEFAULT_HARVEST_WINDOWS = {
  'Pleurotus ostreatus (Blue Oyster)': { min: 50, max: 120 },
  'Pleurotus ostreatus (Pearl Oyster)': { min: 50, max: 120 },
  'Pleurotus citrinolileatus (Golden Oyster)': { min: 40, max: 90 },
  'Pleurotus djamor (Pink Oyster)': { min: 50, max: 100 },
  'King Trumpet (Pleurotus eryngii)': { min: 80, max: 180 },
  "Hericium erinaceus (Lion's Mane)": { min: 60, max: 150 },
  'Lentinula edodes (Shiitake)': { min: 40, max: 90 },
  'Pholiota adiposa (Chestnut)': { min: 60, max: 120 },
  'Cyclocybe aegerita (Pioppino)': { min: 70, max: 140 },
  'Grifola frondosa (Maitake)': { min: 80, max: 200 },
  Maitake: { min: 80, max: 200 }
}

const DEFAULT_PHASE_THRESHOLDS = {
  pinningMax: 10,
  earlyGrowthMax: 50,
  fruitingMax: 100
}

function normalizeSpeciesName(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function getDefaultHarvestWindows() {
  return { ...DEFAULT_HARVEST_WINDOWS }
}

export function getDefaultPhaseThresholds() {
  return { ...DEFAULT_PHASE_THRESHOLDS }
}

export function getMeasuredFlushMm(log) {
  if (!log) return null
  const rawValue = log.flushHeightMm ?? log.growthMmPerDay
  const value = Number(rawValue)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function derivePhaseFromMeasurement(measuredMm, thresholds = {}) {
  const value = Number(measuredMm)
  if (!Number.isFinite(value) || value <= 0) return null
  const limits = { ...DEFAULT_PHASE_THRESHOLDS, ...thresholds }
  if (value <= Number(limits.pinningMax)) return 'Pinning'
  if (value <= Number(limits.earlyGrowthMax)) return 'Early Growth'
  if (value <= Number(limits.fruitingMax)) return 'Fruiting'
  return 'Mature Growth'
}

export function getHarvestWindow(species, customWindows = {}) {
  const mergedWindows = { ...DEFAULT_HARVEST_WINDOWS, ...customWindows }
  if (mergedWindows[species]) return mergedWindows[species]
  const normalizedTarget = normalizeSpeciesName(species)
  const match = Object.entries(mergedWindows).find(
    ([name]) => normalizeSpeciesName(name) === normalizedTarget
  )
  return match?.[1] || null
}

export function getHarvestRecommendation(species, measuredMm, customWindows = {}) {
  const value = Number(measuredMm)
  if (!Number.isFinite(value) || value <= 0) return null
  const window = getHarvestWindow(species, customWindows)
  if (!window?.min || !window?.max) return null

  if (value > window.max) {
    return {
      level: 'urgent',
      message: `Past ideal harvest window (${window.min}-${window.max} mm)`,
      window
    }
  }

  if (value >= window.min) {
    return {
      level: 'ready',
      message: `Harvest ready (${window.min}-${window.max} mm ideal)`,
      window
    }
  }

  if (value >= window.min * 0.8) {
    return {
      level: 'soon',
      message: `Harvest soon (${window.min}-${window.max} mm ideal)`,
      window
    }
  }

  return {
    level: 'watch',
    message: `Target harvest window ${window.min}-${window.max} mm`,
    window
  }
}

export function getLatestMeasurementLog(logs = [], growId) {
  return logs
    .filter((log) => log.growId === growId)
    .filter((log) => getMeasuredFlushMm(log) != null)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null
}
