import { createContext, useContext } from 'react'
import type { RideRequestDetails } from '../lib/rideRequests'

export type UpdatesState = {
  // Requests on the user's rides that are waiting for an answer (driver view).
  pendingRequests: RideRequestDetails[]
  // The user's own requests that were accepted or declined (rider view).
  requestUpdates: RideRequestDetails[]
  loading: boolean
  error: string
  // Check now instead of waiting for the next poll, e.g. right after accepting a request.
  refresh: () => Promise<void>
}

export const UpdatesContext = createContext<UpdatesState | null>(null)

// The signed-in user's latest updates, shared by every page through UpdatesProvider.
export function useUpdates(): UpdatesState {
  const updates = useContext(UpdatesContext)
  if (!updates) throw new Error('useUpdates must be used inside UpdatesProvider')
  return updates
}
