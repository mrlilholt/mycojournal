export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy ?? null
        })
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        ...options
      }
    )
  })
}

export async function reverseGeocode({ lat, lng }) {
  if (lat == null || lng == null) return ''
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
  )
  if (!response.ok) throw new Error('Reverse geocoding failed')
  const data = await response.json()
  return data.display_name || ''
}

export function formatApproximateLocation(location, showExact = false) {
  if (!location) return 'Location unavailable'
  if (location.placeLabel) return location.placeLabel
  if (location.lat == null || location.lng == null) return 'Location unavailable'
  const precision = showExact ? 5 : 2
  return `${Number(location.lat).toFixed(precision)}, ${Number(location.lng).toFixed(precision)}`
}
