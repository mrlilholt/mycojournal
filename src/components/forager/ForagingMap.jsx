import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

function ClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng })
    }
  })
  return null
}

function RecenterMap({ lat, lng, zoom }) {
  const map = useMap()
  const position = useMemo(() => {
    if (lat == null || lng == null) return null
    return [Number(lat), Number(lng)]
  }, [lat, lng])

  useEffect(() => {
    if (!position) return
    map.setView(position, zoom, { animate: false })
  }, [map, position, zoom])
  return null
}

export default function ForagingMap({
  lat,
  lng,
  zoom = 14,
  onChange,
  markers = []
}) {
  const hasCoordinates = lat != null && lng != null
  const center = hasCoordinates ? [Number(lat), Number(lng)] : [39.8283, -98.5795]

  return (
    <div className="forager-map">
      <MapContainer
        key={hasCoordinates ? `${Number(lat).toFixed(5)}:${Number(lng).toFixed(5)}` : 'forager-map-default'}
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="forager-map__canvas"
      >
        <RecenterMap lat={lat} lng={lng} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onChange ? <ClickHandler onChange={onChange} /> : null}
        {hasCoordinates ? <Marker position={center} icon={markerIcon} draggable={Boolean(onChange)} eventHandlers={onChange ? {
          dragend: (event) => {
            const point = event.target.getLatLng()
            onChange({ lat: point.lat, lng: point.lng })
          }
        } : undefined} /> : null}
        {markers.map((marker) =>
          marker.lat != null && marker.lng != null ? (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={markerIcon}
            />
          ) : null
        )}
      </MapContainer>
    </div>
  )
}
