// Ride request statuses, as the backend returns them (RequestStatus in openapi.yaml).
export const RequestStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Declined: 'declined',
} as const

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus]

// How often logged-in pages check GET /updates for new requests and decisions.
export const UPDATES_POLL_MS = 10_000
