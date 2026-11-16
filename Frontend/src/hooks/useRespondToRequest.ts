import { useState } from 'react'
import { ApiError } from '../lib/api'
import { acceptRequest, declineRequest } from '../lib/rideRequests'
import { useUpdates } from './useUpdates'

// What to tell the driver when answering fails, by HTTP status.
const answerErrors: Record<number, string> = {
  400: 'This ride is full.',
  403: "Only the ride's driver can answer this request.",
  404: 'This request was cancelled.',
  409: 'This request was already answered.',
}
const fallbackError = 'Something went wrong. Try again.'
// The request is gone or already answered, so a refresh should take its card away.
const staleStatuses = [404, 409]

type Answer = 'accept' | 'decline'

// The driver's Accept and Decline for one request. Each card has its own, so one busy card
// doesn't lock the others.
export function useRespondToRequest(requestId: string) {
  const { refresh } = useUpdates()
  const [busy, setBusy] = useState<Answer | null>(null)
  const [error, setError] = useState('')

  async function respond(answer: Answer) {
    setBusy(answer)
    setError('')
    try {
      await (answer === 'accept' ? acceptRequest : declineRequest)(requestId)
      // Don't wait for the next poll to take the answered request off the list.
      await refresh()
    } catch (caught) {
      const status = caught instanceof ApiError ? caught.status : 0
      setError(answerErrors[status] ?? fallbackError)
      if (staleStatuses.includes(status)) await refresh()
    } finally {
      setBusy(null)
    }
  }

  return { accept: () => respond('accept'), decline: () => respond('decline'), busy, error }
}
