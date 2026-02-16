const STORAGE_KEY = 'mycojournalpro:v1'
const STORAGE_VERSION = 1

export function loadState(fallbackState) {
  if (typeof localStorage === 'undefined') return fallbackState
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallbackState
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== STORAGE_VERSION) return fallbackState
    if (!parsed.data) return fallbackState
    return parsed.data
  } catch (error) {
    console.error('Failed to load state', error)
    return fallbackState
  }
}

export function saveState(state) {
  if (typeof localStorage === 'undefined') return
  try {
    const payload = JSON.stringify({ version: STORAGE_VERSION, data: state })
    localStorage.setItem(STORAGE_KEY, payload)
  } catch (error) {
    console.error('Failed to save state', error)
  }
}

export function exportState(state) {
  return JSON.stringify({ version: STORAGE_VERSION, data: state }, null, 2)
}

export function importState(raw) {
  const parsed = JSON.parse(raw)
  if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.data) {
    throw new Error('Invalid backup format')
  }
  return parsed.data
}

export { STORAGE_KEY, STORAGE_VERSION }
