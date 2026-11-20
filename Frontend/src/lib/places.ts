// Address suggestions while typing, from Photon (https://photon.komoot.io): free, no API key,
// OpenStreetMap data like our map tiles. Nominatim's rules don't allow search-as-you-type.

export type Place = {
  name: string // first line in the dropdown, e.g. "66 Chancellors Circle"
  detail: string // second line, e.g. "Winnipeg, R3T 2N2"
  label: string // both together; what goes in the input and in origin_label
  coordinates: [number, number] // GeoJSON order: [longitude, latitude]
}

// Rough rectangle around Manitoba as [west, south, east, north] (Photon's bbox order).
const MANITOBA_BOX = '-102.05,48.99,-88.9,60.0'
// Downtown Winnipeg, so nearby matches come first.
const BIAS = { lat: '49.8951', lon: '-97.1384' }

type Feature = {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

function toPlace({ geometry, properties: p }: Feature): Place {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ')
  const town = p.city ?? p.town ?? p.village ?? p.locality ?? p.county
  const name = p.name ?? (street || town || 'Unnamed place')
  // A town on its own (e.g. "Steinbach") has nothing else to show, so say which province.
  const detail = [p.name ? street : '', town, p.postcode].filter((part) => part && part !== name).join(', ') || 'Manitoba'
  return { name, detail, label: `${name}, ${detail}`, coordinates: geometry.coordinates }
}

// OpenStreetMap splits long streets into pieces with different postal codes ("Regent Avenue West,
// Winnipeg, R2C 2Z1" / "… R2C 4H4"). Ignore the postal code so those show up once.
const withoutPostcode = (label: string) => label.replace(/, [A-Z]\d[A-Z] ?\d[A-Z]\d$/, '')

// Same text typed twice (e.g. backspace then retype) is answered from memory.
const cache = new Map<string, Place[]>()

// Up to 5 places in Manitoba matching the text. Pass an AbortSignal to cancel a stale search.
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const key = query.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  // Ask for extra: some get dropped below as duplicates or outside Manitoba.
  const params = new URLSearchParams({ q: query.trim(), limit: '15', lang: 'en', bbox: MANITOBA_BOX, ...BIAS })
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal })
  if (!response.ok) throw new Error(`Status ${response.status}`)
  const { features }: { features: Feature[] } = await response.json()

  // The box also covers bits of Ontario, Saskatchewan and the US, so keep Manitoba only,
  // and drop results that would read the same in the list.
  const seen = new Set<string>()
  const places = features
    .filter((feature) => feature.properties.state === 'Manitoba')
    .map(toPlace)
    .filter((place) => {
      const key = withoutPostcode(place.label)
      return !seen.has(key) && seen.add(key)
    })
    .slice(0, 5)
  cache.set(key, places)
  return places
}

const [WEST, SOUTH, EAST, NORTH] = MANITOBA_BOX.split(',').map(Number)

// Whether a GeoJSON [longitude, latitude] point is inside the rough Manitoba rectangle.
export const inManitoba = ([lng, lat]: readonly number[]) => lng >= WEST && lng <= EAST && lat >= SOUTH && lat <= NORTH

const reverseCache = new Map<string, Place | null>()

// The address at a point picked on the map or from the browser's location, or null when the point
// is outside Manitoba. Photon answers with the nearest building or street, which can be a little
// off from the spot itself, so only its address is used and the place keeps the exact point.
export async function reversePlace(point: readonly number[]): Promise<Place | null> {
  if (!inManitoba(point)) return null
  const [lng, lat] = point
  // About a metre apart counts as the same spot.
  const key = `${lng.toFixed(5)},${lat.toFixed(5)}`
  const cached = reverseCache.get(key)
  if (cached !== undefined) return cached

  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), lang: 'en', limit: '1' })
  const response = await fetch(`https://photon.komoot.io/reverse?${params}`)
  if (!response.ok) throw new Error(`Status ${response.status}`)
  const { features }: { features: Feature[] } = await response.json()

  const coordinates: [number, number] = [lng, lat]
  const feature = features[0]
  let place: Place | null
  if (!feature) {
    // Nothing named nearby (e.g. a field outside town), so describe the spot by its coordinates.
    const detail = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    place = { name: 'Dropped pin', detail, label: `Dropped pin, ${detail}`, coordinates }
  } else if (feature.properties.state !== 'Manitoba') {
    place = null // inside the rectangle but across the border
  } else {
    place = { ...toPlace(feature), coordinates }
  }
  reverseCache.set(key, place)
  return place
}

// Straight-line distance in km between two GeoJSON [longitude, latitude] points.
export function distanceKm([lng1, lat1]: readonly number[], [lng2, lat2]: readonly number[]) {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}
