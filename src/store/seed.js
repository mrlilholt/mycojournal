import { SPECIES_LIST, SPECIES_PRESETS } from '../utils/speciesDefaults.js'

export function createSeedState() {
  const grows = []
  const logs = []
  const events = []
  const harvests = []

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
    healthWeights: {
      recency: 20,
      range: 40,
      co2: 15,
      contam: 25
    }
  }

  return { grows, logs, events, harvests, settings }
}
