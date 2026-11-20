import { useNavigate } from 'react-router'
import type { Ride } from '../components/RideCard'
import { getUser } from '../lib/auth'

// What clicking a ride (a card or its dot on a map) does: drivers go to the edit page for their own
// ride, any other ride opens its details page to request a seat.
export function useOpenRide() {
  const navigate = useNavigate()
  const user = getUser()

  const isOwn = (ride: Ride) => ride.driverId === user?.id
  const openRide = (ride: Ride) => navigate(isOwn(ride) ? `/rides/${ride.id}/edit` : `/rides/${ride.id}`)

  return { openRide, isOwn }
}
