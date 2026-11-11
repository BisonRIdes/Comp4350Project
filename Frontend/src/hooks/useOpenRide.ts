import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Ride } from '../components/RideCard'
import { getUser } from '../lib/auth'

// What clicking a ride does, shared by the dashboard and the map page: drivers go to the edit page
// for their own ride, any other ride opens the details pop-up (render it while selectedRide is set).
export function useOpenRide() {
  const navigate = useNavigate()
  const user = getUser()
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)

  const isOwn = (ride: Ride) => ride.driverId === user?.id

  function openRide(ride: Ride) {
    if (isOwn(ride)) navigate(`/rides/${ride.id}/edit`)
    else setSelectedRide(ride)
  }

  return { selectedRide, openRide, closeRide: () => setSelectedRide(null), isOwn }
}
