import { apiFetch } from './api'
import type { Ride } from '../components/RideCard'

// Every ride goes to campus for now.
export const DESTINATION = 'University of Manitoba'

// What GET /rides returns (RideOut).
export type RideOut = {
  id: string | number
  driver_id: string | number
  departure_time: string
  seats: number
  origin_point?: { type: string; coordinates: [number, number] }
  origin_label?: string
  destination_label?: string
  price_cents?: number
}

export function toRide(raw: RideOut): Ride {
  return {
    id: String(raw.id),
    driverId: String(raw.driver_id),
    from: raw.origin_label,
    to: raw.destination_label ?? DESTINATION,
    departure: raw.departure_time,
    price: raw.price_cents === undefined ? undefined : raw.price_cents / 100,
    // RideOut has no count of accepted riders yet, so this is the total seats offered.
    seatsLeft: raw.seats,
  }
}

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time.
export function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

// Rides that haven't left yet, in the API's shape.
export async function fetchUpcomingRides(): Promise<RideOut[]> {
  const response = await apiFetch('/rides')
  if (!response.ok) throw new Error(`Status ${response.status}`)
  const data: RideOut[] = await response.json()
  const now = Date.now()
  return data.filter((raw) => new Date(raw.departure_time).getTime() > now)
}

// One ride by id (GET /rides/{id}). Returns the response so the page can handle 404.
export function fetchRide(id: string): Promise<Response> {
  return apiFetch(`/rides/${id}`)
}

// The fields PATCH /rides/{id} accepts (UpdateRideBody). Send only the ones that changed.
export type RideChanges = {
  origin_point?: { type: 'Point'; coordinates: [number, number] }
  departure_time?: string
  seats?: number
}

// Edit one of the driver's own rides. Returns the response so the page can handle 403, 404 and 422.
export function updateRide(id: string, changes: RideChanges): Promise<Response> {
  return apiFetch(`/rides/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })
}
