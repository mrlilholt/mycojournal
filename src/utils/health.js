import { daysSince } from './date.js'

export function resolveTargets(grow, settings) {
  const defaults = settings?.defaultTargets || {
    tempMin: 68,
    tempMax: 75,
    humidityMin: 85,
    humidityMax: 95,
    co2Max: 1200
  }

  const targets = {
    tempMin: grow?.targets?.tempMin ?? defaults.tempMin,
    tempMax: grow?.targets?.tempMax ?? defaults.tempMax,
    humidityMin: grow?.targets?.humidityMin ?? defaults.humidityMin,
    humidityMax: grow?.targets?.humidityMax ?? defaults.humidityMax,
    co2Max: grow?.targets?.co2Max ?? defaults.co2Max
  }

  const usedDefaults =
    grow?.targets?.tempMin == null ||
    grow?.targets?.tempMax == null ||
    grow?.targets?.humidityMin == null ||
    grow?.targets?.humidityMax == null ||
    grow?.targets?.co2Max == null

  return { targets, usedDefaults }
}

export function getHealthScore({ grow, logs, events, settings }) {
  const weights = settings?.healthWeights || {
    recency: 20,
    range: 40,
    co2: 15,
    contam: 25
  }
  const recencyDays = settings?.recencyDays ?? 3

  let score = 100
  const reasons = []

  const { targets, usedDefaults } = resolveTargets(grow, settings)
  if (usedDefaults) {
    reasons.push('Targets incomplete; using safe defaults for scoring.')
  }

  const latestLog = logs
    .filter((log) => log.growId === grow.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]

  if (!latestLog) {
    score -= weights.recency
    reasons.push('No logs yet; recency penalty applied.')
  } else {
    const since = daysSince(latestLog.timestamp)
    if (since !== null && since > recencyDays) {
      const penaltyPerDay = weights.recency / recencyDays
      const penalty = Math.min(weights.recency, (since - recencyDays) * penaltyPerDay)
      score -= penalty
      reasons.push(`Last log ${since}d ago; recency penalty applied.`)
    }

    const outOfRange = []
    if (latestLog.temp != null) {
      if (latestLog.temp < targets.tempMin || latestLog.temp > targets.tempMax) {
        outOfRange.push('temperature')
      }
    }
    if (latestLog.humidity != null) {
      if (
        latestLog.humidity < targets.humidityMin ||
        latestLog.humidity > targets.humidityMax
      ) {
        outOfRange.push('humidity')
      }
    }
    if (outOfRange.length) {
      const penalty = (weights.range / 2) * outOfRange.length
      score -= penalty
      reasons.push(`Out of range: ${outOfRange.join(', ')}.`)
    }

    if (latestLog.co2 != null && targets.co2Max != null && latestLog.co2 > targets.co2Max) {
      score -= weights.co2
      reasons.push('CO2 above target range.')
    }
  }

  const recentContam = events.some(
    (event) => event.growId === grow.id && event.type === 'contam'
  )
  if (recentContam) {
    score -= weights.contam
    reasons.push('Contamination event logged.')
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  if (!reasons.length) {
    reasons.push('All signals within target ranges.')
  }

  return { score, reasons }
}
