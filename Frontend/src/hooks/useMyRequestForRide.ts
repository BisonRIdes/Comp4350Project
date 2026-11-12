import { useEffect, useState } from 'react'
import { RequestStatus } from '../constants'
import { ApiError } from '../lib/api'
import { fetchMyRequests, requestRide } from '../lib/rideRequests'

// What to tell the rider when asking for a seat fails, by HTTP status.
const requestErrors: Record<number, string> = {
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

  async function request() {
    setSending(true)
    setError('')
    try {
      await requestRide(rideId)
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
