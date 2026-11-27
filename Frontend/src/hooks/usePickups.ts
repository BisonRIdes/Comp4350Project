import { useEffect, useState } from 'react'
import type { Pickup, Ride } from '../components/RideCard'
import { fetchPickups } from '../lib/rides'

// The riders' pickup points for some rides (only ones the user drives or has a seat on; the backend
// refuses the rest). Returns the rides with their pickups filled in, ready for the map.
export function usePickups(rides: Ride[], rideIds: string[]) {
  const [found, setFound] = useState<Record<string, Pickup[]>>({})
  // The same ids in a new array shouldn't fetch again.
  const joined = [...new Set(rideIds)].sort().join(',')

  useEffect(() => {
    if (!joined) return
    let active = true
    for (const rideId of joined.split(',')) {
      fetchPickups(rideId)
        .then((pickups) => {
          if (active) setFound((previous) => ({ ...previous, [rideId]: pickups }))
        })
        // Not allowed or not reachable: the map just shows the driver's start and the destination.
        .catch(() => undefined)
    }
    return () => {
      active = false
    }
  }, [joined])

  return rides.map((ride) => (found[ride.id]?.length ? { ...ride, pickups: found[ride.id] } : ride))
}
