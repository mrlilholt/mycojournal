function toIsoHour(date) {
  return new Date(date).toISOString().slice(0, 13) + ':00'
}

function sumRange(values = []) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0)
}

function buildRainNote(lastRainAt, rainLast24hMm, rainLast72hMm) {
  if (lastRainAt) {
    const diffMs = Date.now() - new Date(lastRainAt).getTime()
    const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)))
    if (diffHours <= 24) return 'Rain in the last 24 hours'
    if (diffHours <= 48) return 'Light rain yesterday'
    return `Dry for about ${Math.round(diffHours / 24)} days`
  }
  if (rainLast24hMm > 0) return 'Rain in the last 24 hours'
  if (rainLast72hMm > 0) return 'Rain in the last 72 hours'
  return 'No recent rain recorded'
}

export function cToF(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return (Number(value) * 9) / 5 + 32
}

export function formatTemperatureF(value) {
  const fahrenheit = cToF(value)
  return fahrenheit == null ? '—' : `${Math.round(fahrenheit)}°F`
}

export function formatRainMm(value) {
  if (value == null || Number.isNaN(Number(value))) return '0.00 mm'
  return `${Number(value).toFixed(2)} mm`
}

function buildMetricStatus(label, state, detail, score) {
  return { label, state, detail, score }
}

export function evaluateMushroomWeather(weatherSnapshot, recentWeather) {
  if (!weatherSnapshot) return null

  const temperatureF = cToF(weatherSnapshot.temperatureC)
  const humidity = Number(weatherSnapshot.humidity ?? NaN)
  const windKph = Number(weatherSnapshot.windSpeedKph ?? NaN)
  const rain72hMm = Number(recentWeather?.rainLast72hMm ?? NaN)

  let tempMetric = buildMetricStatus('Temperature', 'unknown', 'No temperature reading', 0)
  if (temperatureF != null) {
    if (temperatureF < 45) tempMetric = buildMetricStatus('Temperature', 'poor', 'Too cold for most fruiting', 0)
    else if (temperatureF <= 60) tempMetric = buildMetricStatus('Temperature', 'excellent', 'Excellent for cool-fruiting species', 1)
    else if (temperatureF <= 75) tempMetric = buildMetricStatus('Temperature', 'excellent', 'Peak zone for most mushrooms', 1)
    else if (temperatureF <= 85) tempMetric = buildMetricStatus('Temperature', 'good', 'Still workable, especially for oysters', 1)
    else tempMetric = buildMetricStatus('Temperature', 'poor', 'High heat raises drying risk', 0)
  }

  let humidityMetric = buildMetricStatus('Humidity', 'unknown', 'No humidity reading', 0)
  if (!Number.isNaN(humidity)) {
    if (humidity >= 90) humidityMetric = buildMetricStatus('Humidity', 'excellent', 'Ideal fruiting humidity', 1)
    else if (humidity >= 80) humidityMetric = buildMetricStatus('Humidity', 'good', 'Good moisture retention', 1)
    else if (humidity >= 60) humidityMetric = buildMetricStatus('Humidity', 'marginal', 'Marginal for pin development', 0)
    else humidityMetric = buildMetricStatus('Humidity', 'poor', 'Drying risk is high', 0)
  }

  let windMetric = buildMetricStatus('Wind', 'unknown', 'No wind reading', 0)
  if (!Number.isNaN(windKph)) {
    if (windKph <= 10) windMetric = buildMetricStatus('Wind', 'excellent', 'Low wind keeps surfaces moist', 1)
    else if (windKph <= 20) windMetric = buildMetricStatus('Wind', 'good', 'Acceptable wind', 1)
    else windMetric = buildMetricStatus('Wind', 'poor', 'Wind can dry fruiting bodies quickly', 0)
  }

  let rainMetric = buildMetricStatus('Rain', 'unknown', 'No recent rain data', 0)
  if (!Number.isNaN(rain72hMm)) {
    if (rain72hMm < 5) rainMetric = buildMetricStatus('Rain', 'poor', 'Too dry for a flush trigger', 0)
    else if (rain72hMm < 10) rainMetric = buildMetricStatus('Rain', 'good', 'Moisture is starting to build', 0)
    else if (rain72hMm <= 30) rainMetric = buildMetricStatus('Rain', 'excellent', 'Excellent flush conditions', 1)
    else if (rain72hMm <= 40) rainMetric = buildMetricStatus('Rain', 'good', 'Still strong moisture signal', 1)
    else rainMetric = buildMetricStatus('Rain', 'marginal', 'Wet enough, but watch for rot', 0)
  }

  const metrics = [tempMetric, humidityMetric, windMetric, rainMetric]
  const score = metrics.reduce((total, metric) => total + metric.score, 0)

  let rating = 'Unclear'
  let note = 'Not enough weather data yet.'
  if (score >= 4) {
    rating = 'Prime'
    note = 'Prime mushroom conditions. Expect a flush.'
  } else if (score >= 3) {
    rating = 'High Chance'
    note = 'Very favorable conditions for mushroom hunting.'
  } else if (score >= 2) {
    rating = 'Possible'
    note = 'Possible mushroom activity, but conditions are mixed.'
  } else {
    rating = 'Unlikely'
    note = 'Conditions are weak for a productive mushroom hike.'
  }

  return { metrics, score, rating, note }
}

export function formatMushroomForecastLabel(rating) {
  switch (rating) {
    case 'Prime':
      return 'Mushrooms Prime'
    case 'High Chance':
      return 'Mushrooms Likely'
    case 'Possible':
      return 'Mushrooms Possible'
    case 'Unlikely':
      return 'Mushrooms Unlikely'
    default:
      return 'Mushroom Forecast'
  }
}

export async function fetchWeatherForLocation({ lat, lng, at = new Date().toISOString() }) {
  if (lat == null || lng == null) throw new Error('Coordinates required')

  const currentUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code' +
    '&hourly=precipitation' +
    '&timezone=auto'

  const endDate = new Date(at)
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - 3)

  const archiveUrl =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&start_date=${startDate.toISOString().slice(0, 10)}` +
    `&end_date=${endDate.toISOString().slice(0, 10)}` +
    '&hourly=precipitation' +
    '&timezone=auto'

  const [currentResponse, archiveResponse] = await Promise.all([fetch(currentUrl), fetch(archiveUrl)])
  if (!currentResponse.ok) throw new Error('Current weather unavailable')
  const currentData = await currentResponse.json()
  const archiveData = archiveResponse.ok ? await archiveResponse.json() : null

  const current = currentData.current || {}
  const archiveTimes = archiveData?.hourly?.time || []
  const archiveRain = archiveData?.hourly?.precipitation || []

  const targetHour = toIsoHour(at)
  let lastRainAt = null
  for (let index = archiveTimes.length - 1; index >= 0; index -= 1) {
    const rainValue = Number(archiveRain[index] || 0)
    if (archiveTimes[index] <= targetHour && rainValue > 0) {
      lastRainAt = new Date(archiveTimes[index]).toISOString()
      break
    }
  }

  const rainLast24hMm = sumRange(archiveRain.slice(-24))
  const rainLast72hMm = sumRange(archiveRain.slice(-72))

  return {
    weatherSnapshot: {
      capturedAt: new Date().toISOString(),
      temperatureC: current.temperature_2m ?? null,
      apparentTemperatureC: current.apparent_temperature ?? null,
      humidity: current.relative_humidity_2m ?? null,
      precipitation: current.precipitation ?? null,
      precipitationProbability: null,
      windSpeedKph: current.wind_speed_10m ?? null,
      weatherCode: current.weather_code ?? null,
      source: 'open-meteo'
    },
    recentWeather: {
      lastRainAt,
      rainLast24hMm,
      rainLast72hMm,
      note: buildRainNote(lastRainAt, rainLast24hMm, rainLast72hMm)
    }
  }
}
