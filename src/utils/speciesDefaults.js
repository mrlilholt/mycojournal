import { getDefaultHarvestWindows, getDefaultPhaseThresholds } from './growthPhases.js'

function withGrowthDefaults(preset, harvestWindow = null) {
  return {
    ...preset,
    phaseThresholds: getDefaultPhaseThresholds(),
    harvestWindow: harvestWindow || null
  }
}

export const SPECIES_LIST = [
  'Pleurotus ostreatus (Snow Oyster)',
  'Pholiota adiposa (Chestnut)',
  "Hericium erinaceus (Lion's Mane)",
  'Lentinula edodes (Shiitake)',
  'Pleurotus citrinolileatus (Golden Oyster)',
  'Pleurotus djamor (Pink Oyster)',
  'Pleurotus ostreatus (Blue Oyster)',
  'Pleurotus pulmonarius (Italian Oyster)',
  'Pleurotus sp. (Black King)',
  'King Trumpet (Pleurotus eryngii)',
  'Cyclocybe aegerita (Pioppino)',
  'Pholiota microspora (Nameko)',
  'Ganoderma lucidum (Reishi)'
]

export const SPECIES_PRESETS = {
  'Pleurotus ostreatus (Blue Oyster)': withGrowthDefaults({
    tempMin: 55,
    tempMax: 75,
    humidityMin: 85,
    humidityMax: 95,
    co2Max: 1000
  }, getDefaultHarvestWindows()['Pleurotus ostreatus (Blue Oyster)']),
  'Pleurotus pulmonarius (Italian Oyster)': withGrowthDefaults({
    tempMin: 65,
    tempMax: 75,
    humidityMin: 85,
    humidityMax: 95,
    co2Max: 800
  }, null),
  'Pleurotus citrinolileatus (Golden Oyster)': withGrowthDefaults({
    tempMin: 65,
    tempMax: 80,
    humidityMin: 88,
    humidityMax: 95,
    co2Max: 1000
  }, getDefaultHarvestWindows()['Pleurotus citrinolileatus (Golden Oyster)']),
  'Pleurotus djamor (Pink Oyster)': withGrowthDefaults({
    tempMin: 70,
    tempMax: 80,
    humidityMin: 85,
    humidityMax: 95,
    co2Max: 1000
  }, getDefaultHarvestWindows()['Pleurotus djamor (Pink Oyster)']),
  'Pleurotus ostreatus (Snow Oyster)': withGrowthDefaults({
    tempMin: 45,
    tempMax: 65,
    humidityMin: 85,
    humidityMax: 95,
    co2Max: 1000
  }, null),
  "Hericium erinaceus (Lion's Mane)": withGrowthDefaults({
    tempMin: 55,
    tempMax: 70,
    humidityMin: 80,
    humidityMax: 90,
    co2Max: 1000
  }, getDefaultHarvestWindows()["Hericium erinaceus (Lion's Mane)"]),
  'Pleurotus sp. (Black King)': withGrowthDefaults({
    tempMin: 55,
    tempMax: 70,
    humidityMin: 80,
    humidityMax: 90,
    co2Max: 800
  }, null),
  'King Trumpet (Pleurotus eryngii)': withGrowthDefaults({
    tempMin: 50,
    tempMax: 65,
    humidityMin: 85,
    humidityMax: 95,
    co2Max: 2000
  }, getDefaultHarvestWindows()['King Trumpet (Pleurotus eryngii)']),
  'Pholiota adiposa (Chestnut)': withGrowthDefaults({
    tempMin: 60,
    tempMax: 70,
    humidityMin: 88,
    humidityMax: 95,
    co2Max: 1000
  }, getDefaultHarvestWindows()['Pholiota adiposa (Chestnut)']),
  'Lentinula edodes (Shiitake)': withGrowthDefaults({
    tempMin: 55,
    tempMax: 70,
    humidityMin: 85,
    humidityMax: 95,
    co2Max: 1000
  }, getDefaultHarvestWindows()['Lentinula edodes (Shiitake)']),
  'Cyclocybe aegerita (Pioppino)': withGrowthDefaults({
    tempMin: 55,
    tempMax: 65,
    humidityMin: 85,
    humidityMax: 95,
    co2Max: 2000
  }, getDefaultHarvestWindows()['Cyclocybe aegerita (Pioppino)']),
  'Pholiota microspora (Nameko)': withGrowthDefaults({
    tempMin: 45,
    tempMax: 65,
    humidityMin: 88,
    humidityMax: 95,
    co2Max: 1000
  }, null),
  'Ganoderma lucidum (Reishi)': withGrowthDefaults({
    tempMin: null,
    tempMax: null,
    humidityMin: null,
    humidityMax: null,
    co2Max: null
  }, null)
}
