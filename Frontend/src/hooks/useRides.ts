import { useEffect, useState } from 'react'
import type { Ride } from '../components/RideCard'
import { reverseGeocode } from '../lib/geocode'
import { fetchUpcomingRides, toRide } from '../lib/rides'

export function useRides() {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const upcoming = await fetchUpcomingRides()
        setRides(upcoming.map(toRide))

        // Until the backend stores origin_label, turn origin_point into a place name.
        for (const raw of upcoming) {
          if (raw.origin_label || !raw.origin_point) continue
          reverseGeocode(raw.origin_point.coordinates).then((name) => {
            if (!name) return
            setRides((current) => current.map((ride) => (ride.id === String(raw.id) ? { ...ride, from: name } : ride)))
          })
        }
      } catch {
        setError("Couldn't load rides. Check that the server is running and try again.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { rides, loading, error }
}