// Driving routes from OSRM (https://project-osrm.org): free, no API key, OpenStreetMap data like our
// map tiles and address search. Give it the stops in order (start, any detours, end) and it returns
// the fastest road route through them, with its length and driving time.
//
// The public server is a shared demo server: at most about one request a second, so requests are
// sent one at a time and every answer is remembered.

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

export type Route = {
  path: [number, number][] // the road line, GeoJSON order: [longitude, latitude]
  distanceKm: number
  durationMin: number
}

type OsrmResponse = {
  code: string
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[]
}

// One request at a time, so a map with many rides doesn't flood the server.
let queue: Promise<unknown> = Promise.resolve()
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.catch(() => undefined)
  return run
}

// Keyed by the stops, so the same route asked for twice (or by two maps) is fetched once.
const cache = new Map<string, Promise<Route | null>>()

// About a metre apart counts as the same stop.
export const routeKey = (stops: readonly (readonly number[])[]) =>
  stops.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';')

// The driving route through stops (GeoJSON [longitude, latitude], at least two), or null when no
// road route exists. Throws when the server can't be reached, so a later call can try again.
export function getRoute(stops: readonly (readonly number[])[]): Promise<Route | null> {
  const key = routeKey(stops)
  const cached = cache.get(key)
  if (cached) return cached

  const request = oneAtATime(async () => {
    const response = await fetch(`${OSRM_URL}/${key}?overview=full&geometries=geojson`)
    if (!response.ok) throw new Error(`Status ${response.status}`)
    const data: OsrmResponse = await response.json()
    const best = data.code === 'Ok' ? data.routes?.[0] : undefined
    if (!best) return null
    return { path: best.geometry.coordinates, distanceKm: best.distance / 1000, durationMin: best.duration / 60 }
  })
  cache.set(key, request)
  request.catch(() => cache.delete(key))
  return request
}

// "850 m", "12.4 km", "128 km".
export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return km < 100 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

// "8 min", "1 h 25 min", "2 h".
export function formatDuration(minutes: number) {
  const total = Math.max(1, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

