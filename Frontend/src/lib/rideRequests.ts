import type { RequestStatus } from '../constants'
import { apiFetch, throwIfNotOk } from './api'

// A ride request as the backend returns it (RideRequest in openapi.yaml).
export type RideRequest = {
  id: string
  ride_id: string
  rider_id: string
  status: RequestStatus
}

// A request with who asked, who drives, and when and where the ride leaves (RideRequestDetails).
export type RideRequestDetails = RideRequest & {
  rider_username: string
  driver_username: string
  departure_time: string
  origin_point: { type: string; coordinates: [number, number] }
}

// What GET /updates returns.
export type Updates = {
  // Requests on this user's rides that are waiting for an answer (driver view).
  pending_requests: RideRequestDetails[]
  // This user's requests that were accepted or declined (rider view).
  request_updates: RideRequestDetails[]
}

// The logged-in user asks for a seat on a ride.
export async function requestRide(rideId: string): Promise<RideRequest> {
  const response = await apiFetch(`/rides/${rideId}/requests`, { method: 'POST' })
  await throwIfNotOk(response)
  return response.json()
}

// The ride's driver accepts a request, which adds the rider to the ride.
export async function acceptRequest(requestId: string): Promise<void> {
  await throwIfNotOk(await apiFetch(`/requests/${requestId}/accept`, { method: 'PATCH' }))
}

// The ride's driver declines a request.
export async function declineRequest(requestId: string): Promise<void> {
  await throwIfNotOk(await apiFetch(`/requests/${requestId}/decline`, { method: 'PATCH' }))
}

// The rider cancels their own request. If it was accepted, they also leave the ride.
export async function cancelRequest(requestId: string): Promise<void> {
  await throwIfNotOk(await apiFetch(`/requests/${requestId}/cancel`, { method: 'DELETE' }))
}

// Pending requests on the user's rides, and answers to the requests they made.
export async function fetchUpdates(): Promise<Updates> {
  const response = await apiFetch('/updates')
  await throwIfNotOk(response)
  return response.json()
}

// Every request the user made, in any status and including rides that already left.
export async function fetchMyRequests(): Promise<RideRequestDetails[]> {
  const response = await apiFetch('/requests/mine')
  await throwIfNotOk(response)
  return response.json()
}
