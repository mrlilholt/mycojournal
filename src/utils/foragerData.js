import { formatApproximateLocation } from './foragerLocation.js'

export function getSessions(state) {
  return state.foragingSessions || []
}

export function getFinds(state) {
  return state.foragingFinds || []
}

export function getFindsForSession(finds, sessionId) {
  return finds.filter((find) => find.sessionId === sessionId)
}

export function getSessionSummary(session, finds, showExact = false) {
  const speciesCount = new Set(
    finds.map((find) => find.species?.latinName || find.species?.commonName).filter(Boolean)
  ).size
  const photoCount = finds.reduce((count, find) => count + (find.photos?.length || 0), 0)
  return {
    speciesCount,
    photoCount,
    placeLabel: formatApproximateLocation(session.location, showExact),
    hasFinds: finds.length > 0
  }
}
