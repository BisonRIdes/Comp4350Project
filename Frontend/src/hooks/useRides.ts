import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ride } from '../components/RideCard'
import { UPDATES_POLL_MS } from '../constants'
import { reverseGeocode } from '../lib/geocode'
import { fetchUpcomingRides, toRide } from '../lib/rides'

export function useRides() {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Once rides have shown, a failed reload keeps them on screen instead of replacing them with an error.
  const loadedOnce = useRef(false)

  // State is only set in the .then callbacks, once the answer arrives.
  const load = useCallback(
    () =>
      fetchUpcomingRides().then(
        (upcoming) => {
          loadedOnce.current = true
          // Keep place names already looked up, so reloading doesn't flash the route back to a placeholder.
          setRides((current) =>
            upcoming.map((raw) => {
              const ride = toRide(raw)
              const known = current.find((shown) => shown.id === ride.id)?.from
              return ride.from || !known ? ride : { ...ride, from: known }
            }),
          )
          setError('')
          setLoading(false)

          // Until the backend stores origin_label, turn origin_point into a place name. Names are
          // cached per browser, so reloads don't look the same place up again.
          for (const raw of upcoming) {
            if (raw.origin_label || !raw.origin_point) continue
            reverseGeocode(raw.origin_point.coordinates).then((name) => {
              if (!name) return
              setRides((current) => current.map((ride) => (ride.id === String(raw.id) ? { ...ride, from: name } : ride)))
            })
          }
        },
        () => {
          if (!loadedOnce.current) setError("Couldn't load rides. Check that the server is running and try again.")
          setLoading(false)
        },
      ),
    [],
  )

  // Load again every few seconds, so seats left stay current when someone joins or leaves a ride.
  // Skipped while the tab is hidden, and caught up as soon as it's visible again.
  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, UPDATES_POLL_MS)
    const handleVisibilityChange = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [load])

  return { rides, loading, error, reload: load }
}
