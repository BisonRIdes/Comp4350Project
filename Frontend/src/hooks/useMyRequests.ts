import { useCallback, useEffect, useState } from 'react'
import { RequestStatus } from '../constants'
import { ApiError } from '../lib/api'
import { cancelRequest, fetchMyRequests, type RideRequestDetails } from '../lib/rideRequests'
import { useUpdates } from './useUpdates'

// What to tell the rider when cancelling fails, by HTTP status.
const cancelErrors: Record<number, string> = {
  403: 'You can only cancel your own requests.',
  404: 'This request is already gone.',
}
// Also covers a refund Stripe couldn't make yet; the backend keeps the seat, so trying again is safe.
const fallbackCancelError = "Couldn't cancel right now. Try again."

// Every request the rider made, the ones still in play, and a way to cancel.
export function useMyRequests() {
  const { requestUpdates, refresh } = useUpdates()
  // The time is taken when the list arrives, not while rendering, so every render splits it the same way.
  const [loaded, setLoaded] = useState<{ requests: RideRequestDetails[]; at: number } | null>(null)
  const [error, setError] = useState('')

  // State is only set in the .then callbacks, once the answer arrives.
  const load = useCallback(
    () =>
      fetchMyRequests().then(
        (mine) => {
          setLoaded({ requests: mine, at: Date.now() })
          setError('')
        },
        () => setError("Couldn't load your requests. Check that the server is running and try again."),
      ),
    [],
  )

  // Load again whenever a driver answers, so statuses change here without a second poll.
  const answers = requestUpdates.map((request) => `${request.id}:${request.status}`).join(',')
  useEffect(() => {
    load()
  }, [load, answers])

  // Returns a message to show the rider, or '' once the request is gone.
  async function cancel(requestId: string): Promise<string> {
    let message = ''
    try {
      await cancelRequest(requestId)
    } catch (caught) {
      const status = caught instanceof ApiError ? caught.status : 0
      message = cancelErrors[status] ?? fallbackCancelError
    }
    // Reload both lists, so the card goes away here and the driver's side and the badge catch up.
    await Promise.all([load(), refresh()])
    return message
  }

  const all = loaded?.requests ?? []
  const isDone = (request: RideRequestDetails) =>
    request.status === RequestStatus.Declined || new Date(request.departure_time).getTime() <= (loaded?.at ?? 0)
  return {
    // Upcoming rides the rider is waiting on or has a seat in, soonest first.
    active: all.filter((request) => !isDone(request)),
    // Every request in any status, for the request history. Latest ride first.
    history: [...all].reverse(),
    loading: loaded === null && !error,
    error,
    cancel,
  }
}
