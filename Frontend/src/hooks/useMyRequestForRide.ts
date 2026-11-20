import { useEffect, useState } from 'react'
import { RequestStatus } from '../constants'
import { ApiError } from '../lib/api'
import { geocode } from '../lib/geocode'
import { fetchMyRequests, requestRide } from '../lib/rideRequests'

// What to tell the rider when asking for a seat fails, by HTTP status.
const requestErrors: Record<number, string> = {
  // The last seat was taken while the page was open.
  400: 'This ride is full.',
  403: "You can't request a seat on your own ride.",
  404: 'This ride no longer exists.',
  409: "You've already requested this ride.",
}
const fallbackError = 'Something went wrong. Try again.'

// The signed-in user's request on one ride: whether they already asked, and asking for a seat.
export function useMyRequestForRide(rideId: string) {
  const [found, setFound] = useState<{ rideId: string; status: RequestStatus | null } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchMyRequests()
      .then((requests) => requests.find((request) => request.ride_id === rideId)?.status ?? null)
      // If this check fails the button still shows, and the backend refuses a second request anyway.
      .catch(() => null)
      .then((status) => {
        if (active) setFound({ rideId, status })
      })
    return () => {
      active = false
    }
  }, [rideId])

  
  // pickup is what the rider typed, like "Pembina and Bishop Grandin".
  async function request(pickup: string) {
    if (!pickup.trim()) {
      setError('Enter where you want to be picked up.')
      return
    }
    setSending(true)
    setError('')
    try {
      const coordinates = await geocode(pickup.trim())
      if (!coordinates) {
        setError('We couldn\'t find that place in Manitoba. Try adding the town, e.g. "Main St, Steinbach".')
        return
      }
      await requestRide(rideId, { type: 'Point', coordinates })
      setFound({ rideId, status: RequestStatus.Pending })
    } catch (caught) {
      setError(caught instanceof ApiError ? (requestErrors[caught.status] ?? fallbackError) : fallbackError)
    } finally {
      setSending(false)
    }
  }

  const current = found?.rideId === rideId ? found : null
  return { status: current?.status ?? null, loading: !current, sending, error, request }
}
