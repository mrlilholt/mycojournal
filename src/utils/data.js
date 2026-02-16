export function getLogsForGrow(logs, growId) {
  return logs.filter((log) => log.growId === growId)
}

export function getEventsForGrow(events, growId) {
  return events.filter((event) => event.growId === growId)
}

export function getHarvestsForGrow(harvests, growId) {
  return harvests.filter((harvest) => harvest.growId === growId)
}

export function getLatestLog(logs, growId) {
  const filtered = getLogsForGrow(logs, growId)
  if (!filtered.length) return null
  return filtered
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
}

export function getTimelineItems({ logs, events, harvests, growId }) {
  const logItems = logs
    .filter((log) => log.growId === growId)
    .map((log) => ({
      id: log.id,
      type: 'log',
      timestamp: log.timestamp,
      payload: log
    }))
  const eventItems = events
    .filter((event) => event.growId === growId)
    .map((event) => ({
      id: event.id,
      type: 'event',
      timestamp: event.timestamp,
      payload: event
    }))
  const harvestItems = harvests
    .filter((harvest) => harvest.growId === growId)
    .map((harvest) => ({
      id: harvest.id,
      type: 'harvest',
      timestamp: harvest.date,
      payload: harvest
    }))

  return [...logItems, ...eventItems, ...harvestItems].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )
}
