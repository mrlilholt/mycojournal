import { SPECIES_LIST, SPECIES_PRESETS } from '../utils/speciesDefaults.js'
import { getDefaultHarvestWindows } from '../utils/growthPhases.js'
import { getMergedForagerSpeciesAliases } from '../utils/foragerSpeciesMatch.js'

export function createSeedState() {
  const grows = []
  const logs = []
  const events = []
  const harvests = []
  const foragingSessions = []
  const foragingFinds = []

  const settings = {
    units: 'F',
    recencyDays: 3,
    defaultTargets: {
      tempMin: 68,
      tempMax: 75,
      humidityMin: 85,
      humidityMax: 95,
      co2Max: 1200
    },
    presets: { ...SPECIES_PRESETS },
    speciesList: [...SPECIES_LIST],
    harvestWindows: getDefaultHarvestWindows(),
    healthWeights: {
      recency: 20,
      range: 40,
      co2: 15,
      contam: 25
    },
    uiPreferences: {
      compactCards: false,
      defaultGalleryView: 'grow',
      timelineExpandedDefault: true
    },
    foragerPreferences: {
      defaultMapZoom: 14,
      showExactCoordsInOverview: false,
      autoCompleteSessionAfterSave: false,
      galleryDefaultSource: 'all'
    },
    foragerSpeciesAliases: getMergedForagerSpeciesAliases()
  }

  return { grows, logs, events, harvests, foragingSessions, foragingFinds, settings }
}
