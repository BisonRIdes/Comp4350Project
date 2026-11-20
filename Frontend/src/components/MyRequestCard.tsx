import { useState } from 'react'
import { Link } from 'react-router'
import { RequestStatus } from '../constants'
import { usePlaceName } from '../hooks/usePlaceName'
import type { Payment } from '../lib/payments'
import type { RideRequestDetails } from '../lib/rideRequests'
import { DESTINATION, formatDeparture } from '../lib/rides'
import { errorNotice, secondaryButton } from '../styles'
import { RequestStatusBadge } from './RequestStatusBadge'
import { SeatPayment } from './SeatPayment'

// One of the rider's requests. onCancel is left out when there's nothing to undo (past or declined),
// and returns a message to show when cancelling fails. payment is only there for an accepted seat.
export function MyRequestCard({
  request,
  payment,
  onCancel,
}: {
  request: RideRequestDetails
  payment?: Payment
  onCancel?: () => Promise<string>
}) {
  // Leaving an accepted ride takes two clicks so a rider can't lose their seat by accident.
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const from = usePlaceName(request.origin_point.coordinates)
  const route = from ? `${from} → ${DESTINATION}` : DESTINATION
  const hasSeat = request.status === RequestStatus.Accepted

  async function handleCancel() {
    if (!onCancel) return
    setBusy(true)
    setError('')
    setError(await onCancel())
    setBusy(false)
    setConfirming(false)
  }

  return (
    <article className="rounded-3xl bg-white p-4 ring-1 ring-black/10 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold tracking-tight">
            <span className="font-normal text-subtle">Ride with</span> {request.driver_username}
          </p>
          <p className="mt-0.5 truncate text-sm text-subtle">{route}</p>
          <p className="mt-0.5 text-sm text-subtle">
            {formatDeparture(request.departure_time)} ·{' '}
            <Link to={`/rides/${request.ride_id}`} className="font-medium text-ink underline-offset-4 hover:underline">
              View ride
            </Link>
          </p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>

      {(payment || (onCancel && !confirming)) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 sm:justify-end">
          {payment && <SeatPayment payment={payment} />}
          {onCancel && !confirming && (
            <button
              type="button"
              onClick={hasSeat ? () => setConfirming(true) : handleCancel}
              disabled={busy}
              className={`${secondaryButton} flex-1 disabled:opacity-60 sm:flex-none`}
            >
              {busy ? 'Cancelling…' : hasSeat ? 'Leave ride' : 'Cancel request'}
            </button>
          )}
        </div>
      )}

      {confirming && (
        <div className="mt-4 rounded-2xl bg-danger/5 p-4 text-center ring-1 ring-danger/20">
          <p className="text-sm font-medium text-danger">Give up your seat? If you paid, you'll get a full refund.</p>
          <div className="mt-3 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink ring-1 ring-black/10 transition duration-300 hover:ring-black/30 disabled:opacity-60"
            >
              Keep seat
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="rounded-full bg-danger px-5 py-2.5 text-sm font-medium text-white transition duration-300 hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Leaving…' : 'Yes, leave'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className={`${errorNotice} mt-4`}>
          {error}
        </p>
      )}
    </article>
  )
}
