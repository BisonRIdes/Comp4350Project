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

// Straight-line distance in km between two GeoJSON [longitude, latitude] points.
export function distanceKm([lng1, lat1]: readonly number[], [lng2, lat2]: readonly number[]) {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}
