import { useEffect, useState } from 'react'
import { reverseGeocode } from '../lib/geocode'

// A short place name like "St. Vital" for GeoJSON [longitude, latitude], or null until it's known.
// The backend only stores coordinates, so every screen that shows where a ride starts uses this.
export function usePlaceName(coordinates: readonly number[] | null) {
  const [found, setFound] = useState<{ key: string; name: string | null } | null>(null)
  // A new array with the same point shouldn't look the name up again.
  const key = coordinates ? coordinates.join(',') : ''

  useEffect(() => {
    if (!key) return
    let active = true
    reverseGeocode(key.split(',').map(Number))
      .catch(() => null)
      .then((name) => {
        if (active) setFound({ key, name })
      })
    return () => {
      active = false
    }
  }, [key])

  return found?.key === key ? found.name : null
}
