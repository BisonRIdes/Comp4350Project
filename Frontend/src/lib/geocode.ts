// Rough rectangle around Manitoba as [west, north, east, south].
const MANITOBA_BOX = '-102.05,60.0,-88.9,48.99'

type Result = { lat: string; lon: string; address?: { state?: string } }

// Turns typed text ("Brandon", "Steinbach", "123 Main St Winnipeg") into
// GeoJSON [longitude, latitude], or null if nothing in Manitoba matched.
export async function geocode(query: string): Promise<[number, number] | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    countrycodes: 'ca',
    viewbox: MANITOBA_BOX,
    bounded: '1',
    addressdetails: '1',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!response.ok) {
    return null
  }
  const results: Result[] = await response.json()
  const match = results.find((result) => result.address?.state === 'Manitoba')
  return match ? [Number(match.lon), Number(match.lat)] : null
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Nominatim allows about 1 request per second, so lookups run one at a time.
let queue: Promise<unknown> = Promise.resolve()
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task)
  queue = run.then(() => wait(1100), () => wait(1100))
  return run
}

// Remember names per browser so each place is only looked up once.
const CACHE_KEY = 'placeNames'
function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Storage unavailable; just skip caching.
  }
}

type ReverseResult = {
  display_name?: string
  address?: Record<string, string | undefined>
}

// Turns GeoJSON [longitude, latitude] into a short place name like "St. Vital" or "Brandon".
export async function reverseGeocode([lng, lat]: readonly number[]): Promise<string | null> {
  const key = `${lng.toFixed(3)},${lat.toFixed(3)}`
  const cached = readCache()[key]
  if (cached) return cached

  return throttled(async () => {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      zoom: '14',
      addressdetails: '1',
    })
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`)
    if (!response.ok) return null
    const result: ReverseResult = await response.json()
    const address = result.address ?? {}
    const name =
      address.suburb ?? address.neighbourhood ?? address.town ?? address.village ?? address.city ??
      result.display_name?.split(',')[0] ?? null
    if (name) writeCache({ ...readCache(), [key]: name })
    return name
  })
}