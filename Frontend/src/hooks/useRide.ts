import { useEffect, useState } from 'react'
import type { Ride } from '../components/RideCard'
import { fetchRide, toRide, type RideOut } from '../lib/rides'

// The loaded ride and which id it belongs to, so a different ride never shows the last one's data.
type Loaded = { rideId: string; ride: Ride | null; origin: [number, number] | null; error: string }

// One ride for its details page, with a friendly message instead of the server's when it can't load.
export function useRide(rideId: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let active = true
    fetchRide(rideId)
      .then(async (response): Promise<Loaded> => {
        if (response.status === 404) return { rideId, ride: null, origin: null, error: "This ride doesn't exist anymore." }
        if (!response.ok) return { rideId, ride: null, origin: null, error: "Couldn't load this ride. Try again." }
        const raw: RideOut = await response.json()
        return { rideId, ride: toRide(raw), origin: raw.origin_point?.coordinates ?? null, error: '' }
      })
      .catch(() => ({
        rideId,
        ride: null,
        origin: null,
        error: "Couldn't load this ride. Check that the server is running and try again.",
      }))
      .then((next) => {
        if (active) setLoaded(next)
      })
    return () => {
      active = false
    }
  }, [rideId])

  const current = loaded?.rideId === rideId ? loaded : null
  return {
    ride: current?.ride ?? null,
    origin: current?.origin ?? null,
    loading: !current,
    error: current?.error ?? '',
  }
}
