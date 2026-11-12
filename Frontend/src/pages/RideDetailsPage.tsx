import { Link, useParams } from 'react-router'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import type { Ride } from '../components/RideCard'
import { RequestStatusBadge } from '../components/RequestStatusBadge'
import { RequestStatus } from '../constants'
import { useMyRequestForRide } from '../hooks/useMyRequestForRide'
import { usePlaceName } from '../hooks/usePlaceName'
import { useRide } from '../hooks/useRide'
import { getUser } from '../lib/auth'
import { formatDeparture, routeLabel } from '../lib/rides'
import { errorNotice, headingClass, primaryButton } from '../styles'

// Shown instead of the button once the rider has asked for a seat.
const statusMessages: Record<RequestStatus, string> = {
  [RequestStatus.Pending]: 'Request sent. The driver will answer soon.',
  [RequestStatus.Accepted]: 'The driver accepted your request.',
  [RequestStatus.Declined]: 'The driver declined this request.',
}

function RideSummary({ ride }: { ride: Ride }) {
  return (
    <div className="mt-10 rounded-3xl bg-mist p-6">
      <p className="text-[17px] font-semibold tracking-tight">{routeLabel(ride)}</p>
      <p className="mt-0.5 text-sm text-subtle">{formatDeparture(ride.departure)}</p>
      {ride.driver && <p className="mt-0.5 text-sm text-subtle">Driven by {ride.driver}</p>}
      <p className="mt-5 border-t border-black/10 pt-5 text-sm text-subtle">
        {ride.seatsLeft === 0 ? 'Full' : `${ride.seatsLeft} ${ride.seatsLeft === 1 ? 'seat' : 'seats'} left`}
        {ride.price !== undefined && ` · $${ride.price.toFixed(2)} per seat`}
      </p>
    </div>
  )
}

// The driver looking at their own ride can't request it, so they get a way to edit it instead.
function OwnRide({ rideId }: { rideId: string }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
      <p className="text-[15px] text-subtle">This is your ride.</p>
      <Link to={`/rides/${rideId}/edit`} className={primaryButton}>
        Edit ride
        <Icon className="h-4 w-4">{icons.arrow}</Icon>
      </Link>
    </div>
  )
}

// "Request seat", or where the request stands if the rider already asked. A full ride can't be
// requested, but a rider who already asked still sees their request.
function RequestSeat({ rideId, full }: { rideId: string; full: boolean }) {
  const { status, loading, sending, error, request } = useMyRequestForRide(rideId)

  if (loading) return <div aria-label="Checking your requests" className="mt-8 h-12 animate-pulse rounded-full bg-mist" />
  if (status) {
    return (
      <p role="status" className="mt-8 flex flex-wrap items-center gap-3 text-[15px]">
        <RequestStatusBadge status={status} />
        {statusMessages[status]}
      </p>
    )
  }
  if (full) {
    return (
      <p role="status" className="mt-8 rounded-3xl bg-mist px-6 py-6 text-center text-[15px] font-medium">
        This ride is full.
      </p>
    )
  }
  return (
    <div className="mt-8 space-y-4">
      <button type="button" onClick={request} disabled={sending} className={`${primaryButton} w-full disabled:opacity-60`}>
        {sending ? 'Requesting…' : 'Request seat'}
        <Icon className="h-4 w-4">{icons.arrow}</Icon>
      </button>
      {error && (
        <p role="alert" className={errorNotice}>
          {error}
        </p>
      )}
    </div>
  )
}

// Opened by clicking another driver's ride on the dashboard: /rides/:rideId
export default function RideDetailsPage() {
  const { rideId = '' } = useParams()
  const { ride, origin, loading, error } = useRide(rideId)
  const from = usePlaceName(origin)
  const isOwn = ride !== null && ride.driverId === getUser()?.id

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-subtle transition-colors duration-300 hover:text-ink"
        >
          <Icon className="h-4 w-4 rotate-180">{icons.chevron}</Icon>
          Back to rides
        </Link>

        <h1 className={`mt-6 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Ride to <em className="text-subtle">campus.</em>
        </h1>

        {loading ? (
          <div aria-label="Loading ride" className="mt-10 h-48 animate-pulse rounded-3xl bg-mist" />
        ) : !ride ? (
          <div role="alert" className="mt-10 rounded-3xl bg-mist px-6 py-12 text-center">
            <p className="text-lg font-medium">{error}</p>
            <Link to="/dashboard" className={`${primaryButton} mt-6`}>
              Back to rides
              <Icon className="h-4 w-4">{icons.arrow}</Icon>
            </Link>
          </div>
        ) : (
          <>
            <RideSummary ride={{ ...ride, from: from ?? ride.from }} />
            {isOwn ? <OwnRide rideId={ride.id} /> : <RequestSeat rideId={ride.id} full={ride.seatsLeft === 0} />}
          </>
        )}
      </main>
    </div>
  )
}
