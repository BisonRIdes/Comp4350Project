import { Fragment, useEffect, useMemo } from 'react'
import type { LatLngTuple } from 'leaflet'
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Ride } from './RideCard'
import { dateFormat, timeFormat } from '../lib/format'
import { colorDot, dot, previewDot, TILE_ATTRIBUTION, TILE_URL, toLatLng } from '../lib/mapUtils'
import type { Place } from '../lib/places'
import { rideColors } from '../lib/rideColor'
import { DESTINATION, DESTINATION_POINT } from '../lib/rides'
import { formatDistance, formatDuration } from '../lib/routing'
import { getUser } from '../lib/auth'
import { useRoutes } from '../hooks/useRoutes'

const campus = toLatLng(DESTINATION_POINT)

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

// Map of rides: where each one starts, its riders' pickups (when the user may see them), campus, and
// the driving route through them (from OSRM, see lib/routing.ts). Until a route has loaded, or if the
// routing server can't be reached, a dashed straight line is drawn instead. Pass onSelect to make the dots clickable,
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

// Start, riders' pickups in order, then the end of a ride's route.
const stopsOf = (ride: Ride): [number, number][] =>
  ride.origin
    ? [ride.origin, ...(ride.pickups ?? []).map((pickup) => pickup.point), ride.destination ?? DESTINATION_POINT]
    : []

// Stops without any pending previewed pickup, so a preview map can also show the existing route faintly.
const existingStopsOf = (ride: Ride): [number, number][] =>
  ride.origin
    ? [
        ride.origin,
        ...(ride.pickups ?? []).filter((pickup) => !pickup.preview).map((pickup) => pickup.point),
        ride.destination ?? DESTINATION_POINT,
      ]
    : []

export function RideMap({ rides, onSelect, searchPlaces = [], searchRadiusKm, highlightedId, onHover }: RideMapProps) {
  const routeFor = useRoutes([
    ...rides.map(stopsOf),
    ...rides.filter((ride) => ride.pickups?.some((pickup) => pickup.preview)).map(existingStopsOf),
  ])
  const rideIdsKey = rides.map((ride) => ride.id).join(',')
  const colors = useMemo(() => rideColors(rideIdsKey ? rideIdsKey.split(',') : []), [rideIdsKey])
  const colorOf = (rideId: string) => colors.get(rideId) ?? '#1d1d1f'
  const me = getUser()?.id
  // Only re-frame when the coordinates change, not on every render (e.g. when a place name loads),
  // so the map doesn't undo the user's panning.
  const origins = rides.flatMap((ride) => (ride.origin ? [ride.origin] : []))
  const pickups = rides.flatMap((ride) => (ride.pickups ?? []).map((pickup) => pickup.point))
  const searched = searchPlaces.map((place) => place.coordinates)
  const coordsKey = [...origins, ...pickups, ...searched].map((point) => point.join(',')).join(';')
  const points = useMemo(() => {
    const spots = coordsKey ? coordsKey.split(';').map((pair) => toLatLng(pair.split(',').map(Number))) : []
    return [...spots, campus]
  }, [coordsKey])

  return (
    <MapContainer center={campus} zoom={13} scrollWheelZoom={false} className="isolate h-full w-full">
      <FitToPoints points={points} />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {rides.map((ride) => {
        if (!ride.origin || !ride.pickups?.some((pickup) => pickup.preview)) return null
        const existingStops = existingStopsOf(ride)
        const existingRoute = routeFor(existingStops)
        return (
          <Polyline
            key={`existing-line-${ride.id}`}
            positions={existingRoute ? existingRoute.path.map(toLatLng) : existingStops.map(toLatLng)}
            pathOptions={{ color: colorOf(ride.id), weight: 3, opacity: 0.35, dashArray: '6 8' }}
          />
        )
      })}
      {rides.map((ride) => {
        if (!ride.origin) return null
        const route = routeFor(stopsOf(ride))
        const highlighted = ride.id === highlightedId
        const color = colorOf(ride.id)
        const weight = highlighted ? 6 : 4
        const opacity = highlightedId ? (highlighted ? 1 : 0.25) : 0.85
        return (
          <Polyline
            key={`line-${ride.id}`}
            positions={route ? route.path.map(toLatLng) : stopsOf(ride).map(toLatLng)}
            // Solid along the roads; dashed while it's only the straight line.
            pathOptions={{ color, weight, opacity, dashArray: route ? undefined : '6 8' }}
            eventHandlers={{
              click: () => onSelect?.(ride),
              mouseover: () => onHover?.(ride.id),
              mouseout: () => onHover?.(null),
            }}
          />
        )
      })}
      {rides.map((ride) => {
        if (!ride.origin) return null
        const departure = new Date(ride.departure)
        const highlighted = ride.id === highlightedId
        const color = colorOf(ride.id)
        const route = routeFor(stopsOf(ride))
        return (
          <Marker
            key={ride.id}
            position={toLatLng(ride.origin)}
            icon={colorDot(color, highlighted ? 24 : 16)}
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
              {route && ` · ${formatDistance(route.distanceKm)}, about ${formatDuration(route.durationMin)}`}
            </Tooltip>
          </Marker>
        )
      })}
      {rides.flatMap((ride) => {
        const color = colorOf(ride.id)
        const highlighted = ride.id === highlightedId
        return (ride.pickups ?? []).map((pickup, index) => (
          <Marker
            key={`pickup-${ride.id}-${pickup.riderId}-${index}`}
            position={toLatLng(pickup.point)}
            icon={pickup.preview ? previewDot(color, highlighted ? 22 : 20) : colorDot(color, highlighted ? 18 : 14, true)}
            zIndexOffset={pickup.preview ? 1100 : highlighted ? 900 : 0}
            eventHandlers={{
              click: () => onSelect?.(ride),
              mouseover: () => onHover?.(ride.id),
              mouseout: () => onHover?.(null),
            }}
          >
            <Tooltip permanent={Boolean(pickup.preview)} direction="top" offset={[0, pickup.preview ? -12 : -8]}>
              {pickup.preview
                ? `Requested pickup${pickup.riderName ? `: ${pickup.riderName}` : ''} · stop ${index + 1}`
                : `${pickup.riderId === me ? 'Your pickup' : 'Rider pickup'} · stop ${index + 1}`}
            </Tooltip>
          </Marker>
        ))
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
