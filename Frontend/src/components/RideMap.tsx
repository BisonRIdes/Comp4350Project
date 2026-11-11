import { Fragment, useEffect, useMemo } from 'react'
import { divIcon, type LatLngTuple } from 'leaflet'
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Ride } from './RideCard'
import { dateFormat, timeFormat } from '../lib/format'
import type { Place } from '../lib/places'
import { DESTINATION, DESTINATION_POINT } from '../lib/rides'

// The API uses GeoJSON [longitude, latitude]; Leaflet wants [latitude, longitude].
const toLatLng = ([lng, lat]: readonly number[]): LatLngTuple => [lat, lng]
const campus = toLatLng(DESTINATION_POINT)

// Plain dots drawn with CSS. Leaflet's default pin images don't load after Vite bundles them.
function dot(className: string, size = 16) {
  return divIcon({ className: '', html: `<span class="block h-full w-full rounded-full ring-4 ${className}"></span>`, iconSize: [size, size] })
}
const originIcon = dot('bg-ink ring-white shadow-md')
const highlightedIcon = dot('bg-ink ring-white shadow-lg', 24)
const campusIcon = dot('bg-white ring-ink')
const searchIcon = dot('bg-white ring-subtle shadow-md')

// Leaflet measures its box once, when it starts. Inside a dialog that box is still hidden then,
// so re-measure and re-frame the points whenever the box changes size (dialog opens, window resizes).
function FitToPoints({ points }: { points: LatLngTuple[] }) {
  const map = useMap()

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
      if (points.length > 1) map.fitBounds(points, { padding: [40, 40] })
      else map.setView(points[0], 13)
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, points])

  return null
}

// Map of rides: where each one starts, campus, and a dashed straight line between them.
// Real driving routes come later from OpenRouteService. Pass onSelect to make the dots clickable,
// and searchPlaces to also show the addresses the rider searched with a circle around each.
// highlightedId enlarges one ride's dot; onHover reports which dot the pointer is over (null when it leaves).
type RideMapProps = {
  rides: Ride[]
  onSelect?: (ride: Ride) => void
  searchPlaces?: Place[]
  searchRadiusKm?: number
  highlightedId?: string | null
  onHover?: (rideId: string | null) => void
}

export function RideMap({ rides, onSelect, searchPlaces = [], searchRadiusKm, highlightedId, onHover }: RideMapProps) {
  // Only re-frame when the coordinates change, not on every render (e.g. when a place name loads),
  // so the map doesn't undo the user's panning.
  const origins = rides.flatMap((ride) => (ride.origin ? [ride.origin] : []))
  const searched = searchPlaces.map((place) => place.coordinates)
  const coordsKey = [...origins, ...searched].map((point) => point.join(',')).join(';')
  const points = useMemo(() => {
    const spots = coordsKey ? coordsKey.split(';').map((pair) => toLatLng(pair.split(',').map(Number))) : []
    return [...spots, campus]
  }, [coordsKey])

  return (
    <MapContainer center={campus} zoom={13} scrollWheelZoom={false} className="isolate h-full w-full">
      <FitToPoints points={points} />
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {rides.map((ride) =>
        ride.origin ? (
          <Polyline
            key={`line-${ride.id}`}
            positions={[toLatLng(ride.origin), campus]}
            pathOptions={
              ride.id === highlightedId
                ? { color: '#1d1d1f', weight: 4, opacity: 1, dashArray: '6 8' }
                : { color: '#1d1d1f', weight: 3, opacity: 0.6, dashArray: '6 8' }
            }
          />
        ) : null,
      )}
      {rides.map((ride) => {
        if (!ride.origin) return null
        const departure = new Date(ride.departure)
        const highlighted = ride.id === highlightedId
        return (
          <Marker
            key={ride.id}
            position={toLatLng(ride.origin)}
            icon={highlighted ? highlightedIcon : originIcon}
            // Keep the highlighted dot on top of any it overlaps.
            zIndexOffset={highlighted ? 1000 : 0}
            eventHandlers={{
              click: () => onSelect?.(ride),
              mouseover: () => onHover?.(ride.id),
              mouseout: () => onHover?.(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {ride.from ?? 'Starting point'} · {dateFormat.format(departure)}, {timeFormat.format(departure)}
            </Tooltip>
          </Marker>
        )
      })}
      {searchPlaces.map((place) => (
        <Fragment key={`search-${place.label}`}>
          {searchRadiusKm && (
            <Circle
              center={toLatLng(place.coordinates)}
              radius={searchRadiusKm * 1000}
              pathOptions={{ color: '#6e6e73', weight: 1, fillOpacity: 0.06, dashArray: '4 6' }}
            />
          )}
          <Marker position={toLatLng(place.coordinates)} icon={searchIcon}>
            <Tooltip direction="top" offset={[0, -10]}>You searched: {place.name}</Tooltip>
          </Marker>
        </Fragment>
      ))}
      <Marker position={campus} icon={campusIcon}>
        <Tooltip direction="top" offset={[0, -10]}>{DESTINATION}</Tooltip>
      </Marker>
    </MapContainer>
  )
}
