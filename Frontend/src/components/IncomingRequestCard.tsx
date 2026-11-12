import { Link } from 'react-router'
import { usePlaceName } from '../hooks/usePlaceName'
import { useRespondToRequest } from '../hooks/useRespondToRequest'
import type { RideRequestDetails } from '../lib/rideRequests'
import { DESTINATION, formatDeparture } from '../lib/rides'
import { errorNotice, primaryButton, secondaryButton } from '../styles'
import { Icon } from './Icon'
import { icons } from './icons'

// One rider asking to join one of the driver's rides, with Accept and Decline.
export function IncomingRequestCard({ request }: { request: RideRequestDetails }) {
  const { accept, decline, busy, error } = useRespondToRequest(request.id)
  const from = usePlaceName(request.origin_point.coordinates)
  const route = from ? `${from} → ${DESTINATION}` : DESTINATION

  return (
    <article className="rounded-3xl bg-white p-4 ring-1 ring-black/10 sm:p-5">
      <div className="flex gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mist font-serif text-lg font-semibold text-ink">
          {request.rider_username.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[17px] font-semibold tracking-tight">
            {request.rider_username} <span className="font-normal text-subtle">wants to join your ride</span>
          </p>
          <p className="mt-0.5 truncate text-sm text-subtle">{route}</p>
          <p className="mt-0.5 text-sm text-subtle">
            {formatDeparture(request.departure_time)} ·{' '}
            <Link to={`/rides/${request.ride_id}`} className="font-medium text-ink underline-offset-4 hover:underline">
              View ride
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3 sm:justify-end">
        <button
          type="button"
          onClick={decline}
          disabled={busy !== null}
          className={`${secondaryButton} flex-1 disabled:opacity-60 sm:flex-none`}
        >
          {busy === 'decline' ? 'Declining…' : 'Decline'}
        </button>
        <button
          type="button"
          onClick={accept}
          disabled={busy !== null}
          className={`${primaryButton} flex-1 disabled:opacity-60 sm:flex-none`}
        >
          {busy === 'accept' ? 'Accepting…' : 'Accept'}
          <Icon className="h-4 w-4">{icons.check}</Icon>
        </button>
      </div>

      {error && (
        <p role="alert" className={`${errorNotice} mt-4`}>
          {error}
        </p>
      )}
    </article>
  )
}
