import { Link } from 'react-router'
import { RequestStatus } from '../constants'
import { usePlaceName } from '../hooks/usePlaceName'
import type { RideRequestDetails } from '../lib/rideRequests'
import { DESTINATION, formatDeparture } from '../lib/rides'
import { RequestStatusBadge } from './RequestStatusBadge'

// What the driver did, from the rider's side.
const outcomes: Record<RequestStatus, string> = {
  [RequestStatus.Pending]: 'has your request',
  [RequestStatus.Accepted]: 'accepted your request',
  [RequestStatus.Declined]: 'declined your request',
}

// A driver's answer to one of the rider's requests, and which ride it was for.
// isNew marks an answer that was unread when the rider opened notifications.
export function RequestUpdateCard({ request, isNew = false }: { request: RideRequestDetails; isNew?: boolean }) {
  const from = usePlaceName(request.origin_point.coordinates)
  const route = from ? `${from} → ${DESTINATION}` : DESTINATION

  return (
    <article className="flex flex-wrap items-start justify-between gap-3 rounded-3xl bg-white p-4 ring-1 ring-black/10 sm:p-5">
      <div className="min-w-0">
        <p className="text-[17px] font-semibold tracking-tight">
          {request.driver_username} <span className="font-normal text-subtle">{outcomes[request.status]}</span>
        </p>
        <p className="mt-0.5 truncate text-sm text-subtle">{route}</p>
        <p className="mt-0.5 text-sm text-subtle">
          {formatDeparture(request.departure_time)} ·{' '}
          <Link to={`/rides/${request.ride_id}`} className="font-medium text-ink underline-offset-4 hover:underline">
            View ride
          </Link>
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isNew && (
          <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            New
          </span>
        )}
        <RequestStatusBadge status={request.status} />
      </div>
    </article>
  )
}
