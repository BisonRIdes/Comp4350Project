import { useEffect, useRef } from 'react'
import type { LatLngTuple, Marker as LeafletMarker } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { dot, TILE_ATTRIBUTION, TILE_URL, toLatLng } from '../lib/mapUtils'

const pinIcon = dot('bg-ink ring-white shadow-lg', 24)
const WINNIPEG: LatLngTuple = [49.8951, -97.1384]
const PIN_ZOOM = 15

type PickerMapProps = {
  point: readonly number[] | null // where the pin is, GeoJSON [longitude, latitude]
  flyTo: readonly number[] | null // a new value moves the map there (e.g. the user's location)
  onPick: (point: [number, number]) => void
}

function Controller({ start, flyTo, onPick }: { start: readonly number[] | null } & Omit<PickerMapProps, 'point'>) {
  const map = useMap()
  // Only the spot the dialog opened with is framed; later pins don't move the view.
  const startRef = useRef(start)

  useMapEvents({ click: (event) => onPick([event.latlng.lng, event.latlng.lat]) })

  // The map starts inside a dialog that isn't shown yet, so it's 0×0. Re-measure whenever its box
  // changes, and frame the starting spot the first time it has a real size.
  useEffect(() => {
    let framed = false
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
      if (!framed && map.getContainer().clientWidth > 0) {
        framed = true
        const first = startRef.current
        map.setView(first ? toLatLng(first) : WINNIPEG, first ? PIN_ZOOM : 11)
      }
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  useEffect(() => {
    if (flyTo) map.setView(toLatLng(flyTo), Math.max(map.getZoom(), PIN_ZOOM))
  }, [map, flyTo])

  return null
}

// Map for choosing a spot: click to drop the pin, drag it to fine-tune.
export function PickerMap({ point, flyTo, onPick }: PickerMapProps) {
  return (
    <MapContainer center={WINNIPEG} zoom={11} className="isolate h-full w-full">
      <Controller start={point} flyTo={flyTo} onPick={onPick} />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {point && (
        <Marker
          position={toLatLng(point)}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const { lat, lng } = (event.target as LeafletMarker).getLatLng()
              onPick([lng, lat])
            },
          }}
        />
      )}
    </MapContainer>
  )
}
