import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiFetch } from '../lib/api'
import { formatPrice, readPayment, type Payment } from '../lib/payments'
import { formatDeparture, routeLabel } from '../lib/rides'
import { primaryButton } from '../styles'
import { Icon } from './Icon'
import { icons } from './icons'
import type { Ride } from './RideCard'

// The part of GET /updates this needs: the rider's own requests that got an answer.
type Updates = { request_updates: { id: string; status: 'accepted' | 'declined' }[] }

// The rider's accepted seats on upcoming rides, each with "Pay" or "Paid". Hidden when there are none.
export function YourSeats({ rides }: { rides: Ride[] }) {
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    let active = true
    async function load() {
      const response = await apiFetch('/updates')
      if (!response.ok) return
      const { request_updates }: Updates = await response.json()
      const accepted = request_updates.filter((request) => request.status === 'accepted')
      const found = await Promise.all(accepted.map((request) => readPayment(request.id)))
      if (active) setPayments(found)
    }
    // Rides still show if this fails; the section just stays hidden.
    load().catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // GET /rides only has upcoming rides, so seats on rides that already left drop out here.
  const seats = payments.flatMap((payment) => {
    const ride = rides.find((candidate) => candidate.id === payment.ride_id)
    return ride ? [{ payment, ride }] : []
  })
  if (seats.length === 0) return null

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-semibold tracking-tight">Your seats</h2>
      <ul className="mt-6 space-y-3">
        {seats.map(({ payment, ride }) => (
          <li
            key={payment.request_id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 ring-1 ring-black/10 sm:p-5"
          >
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold tracking-tight">{routeLabel(ride)}</p>
              <p className="mt-0.5 text-sm text-subtle">{formatDeparture(ride.departure)}</p>
            </div>
            {payment.status === 'paid' ? (
              <Link
                to={`/requests/${payment.request_id}/pay`}
                className="inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-medium text-ink"
              >
                <Icon className="h-4 w-4">{icons.check}</Icon>
                Paid {formatPrice(payment.amount_cents ?? 0)}
              </Link>
            ) : payment.amount_cents !== null ? (
              <Link to={`/requests/${payment.request_id}/pay`} className={primaryButton}>
                Pay {formatPrice(payment.amount_cents)}
                <Icon className="h-4 w-4">{icons.arrow}</Icon>
              </Link>
            ) : (
              <span className="text-sm text-subtle">No payment needed</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
