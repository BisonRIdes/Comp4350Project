import { reversePlace, type Place } from './places'

// The browser's current position as GeoJSON [longitude, latitude]. The browser asks the user for
// permission the first time. Rejects with a message that can be shown as is.
export function getCurrentPoint(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error("Your browser can't share your location. Type the address or pick it on the map."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.longitude, position.coords.latitude]),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "Location access is blocked. Allow it in your browser's site settings, or pick the spot on the map."
              : "Couldn't find your location. Try again, or pick the spot on the map.",
          ),
        ),
      // A position from the last minute is fine, and give up after 10 seconds.
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}

// Where the user is right now, as a place with its address. Rejects with a message to show.
export async function findMyPlace(): Promise<Place> {
  const point = await getCurrentPoint()
  let place: Place | null
  try {
    place = await reversePlace(point)
  } catch {
    throw new Error("Found your location but couldn't look up its address. Check your connection and try again.")
  }
  if (!place) throw new Error("You seem to be outside Manitoba, so your location can't be used. Pick a spot on the map instead.")
  return place
}
