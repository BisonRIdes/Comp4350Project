import { useState } from 'react'
import { RequestStatus } from '../constants'
import type { Payment } from '../lib/payments'
import { errorNotice } from '../styles'
import { RequestStatusBadge } from './RequestStatusBadge'
import { SeatPayment } from './SeatPayment'

// The rider's seat, shown inside the ride's card in "My seats": where the request stands, paying, and
// cancelling. payment is only there for an accepted seat. onCancel returns a message when it fails.
export function SeatActions({
  status,
  payment,
  onCancel,
}: {
  status: RequestStatus
  payment?: Payment
  onCancel: () => Promise<string>
}) {
  // Leaving an accepted ride takes two clicks so a rider can't lose their seat by accident.
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const hasSeat = status === RequestStatus.Accepted

  async function handleCancel() {
    setBusy(true)
    setError('')
    setError(await onCancel())
    setBusy(false)
    setConfirming(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RequestStatusBadge status={status} />
        {!confirming && (
          <div className="flex flex-wrap items-center gap-3">
            {payment && <SeatPayment payment={payment} />}
            <button
              type="button"
              onClick={hasSeat ? () => setConfirming(true) : handleCancel}
              disabled={busy}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink ring-1 ring-black/15 transition duration-300 hover:ring-black/40 disabled:opacity-60"
            >
              {busy ? 'Cancelling…' : hasSeat ? 'Leave ride' : 'Cancel request'}
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <div className="mt-3 rounded-2xl bg-danger/5 p-4 text-center ring-1 ring-danger/20">
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
        <p role="alert" className={`${errorNotice} mt-3`}>
          {error}
        </p>
      )}
    </div>
  )
}
