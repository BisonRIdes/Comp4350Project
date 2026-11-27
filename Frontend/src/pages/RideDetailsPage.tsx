import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { AddressInput } from '../components/AddressInput'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { GroupChatButton } from '../components/GroupChatButton'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { LazyRideMap } from '../components/LazyRideMap'
import type { Pickup, Ride } from '../components/RideCard'
import { RequestStatusBadge } from '../components/RequestStatusBadge'
import { RequestStatus } from '../constants'
import { useMyRequestForRide } from '../hooks/useMyRequestForRide'
import { usePickups } from '../hooks/usePickups'
import { usePlaceName } from '../hooks/usePlaceName'
import { useRespondToRequest } from '../hooks/useRespondToRequest'
import { useRide } from '../hooks/useRide'
import { useRoutes } from '../hooks/useRoutes'
import { useUpdates } from '../hooks/useUpdates'
import { getUser } from '../lib/auth'
import { distanceKm, type Place } from '../lib/places'
import type { RideRequestDetails } from '../lib/rideRequests'
import { DESTINATION_POINT, formatDeparture, routeLabel } from '../lib/rides'
import { formatDistance, formatDuration } from '../lib/routing'
import { errorNotice, headingClass, primaryButton, secondaryButton } from '../styles'

// Shown instead of the button once the rider has asked for a seat.
const statusMessages: Record<RequestStatus, string> = {
  [RequestStatus.Pending]: 'Request sent. The driver will answer soon.',
  [RequestStatus.Accepted]: 'The driver accepted your request.',
  [RequestStatus.Declined]: 'The driver declined this request.',
}

function RideSummary({ ride, acceptedCount = 0, heading }: { ride: Ride; acceptedCount?: number; heading?: string }) {
  return (
    <div className="mt-6 rounded-3xl bg-mist p-6">
      {heading && <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">{heading}</p>}
      <p className="text-[17px] font-semibold tracking-tight">{routeLabel(ride)}</p>
      <p className="mt-0.5 text-sm text-subtle">{formatDeparture(ride.departure)}</p>
      {ride.driver && <p className="mt-0.5 text-sm text-subtle">Driven by {ride.driver}</p>}
      <p className="mt-5 border-t border-black/10 pt-5 text-sm text-subtle">
        {ride.seatsLeft === 0 ? 'Full' : `${ride.seatsLeft} ${ride.seatsLeft === 1 ? 'seat' : 'seats'} left`}
        {ride.price !== undefined && ` · $${ride.price.toFixed(2)} per seat`}
        {acceptedCount > 0 && ` · ${acceptedCount} ${acceptedCount === 1 ? 'rider' : 'riders'} joined`}
      </p>
    </div>
  )
}

type Decision = typeof RequestStatus.Accepted | typeof RequestStatus.Declined

// Shown when a driver opens "Preview ride" from Notifications: details of the rider asking to join,
// how far their requested pickup is, how much detour it adds, and Accept / Decline actions.
function RequestPreviewSection({
  request,
  ride,
  existingPickups,
  decision,
  onDecision,
}: {
  request: RideRequestDetails
  ride: Ride
  existingPickups: Pickup[]
  decision: Decision | null
  onDecision: (next: Decision) => void
}) {
  const { accept, decline, busy, error } = useRespondToRequest(request.id)
  const requestedPoint = request.detour_point?.coordinates ?? null
  const pickupName = usePlaceName(requestedPoint)
  const destination = ride.destination ?? DESTINATION_POINT

  const currentStops: [number, number][] = ride.origin
    ? [ride.origin, ...existingPickups.map((pickup) => pickup.point), destination]
    : []
  const previewPickups = requestedPoint
    ? [...existingPickups, { riderId: request.rider_id, point: requestedPoint }].sort(
        (a, b) => distanceKm(b.point, destination) - distanceKm(a.point, destination),
      )
    : existingPickups
  const previewStops: [number, number][] = ride.origin
    ? [ride.origin, ...previewPickups.map((pickup) => pickup.point), destination]
    : []

  const routeFor = useRoutes([currentStops, previewStops])
  const currentRoute = routeFor(currentStops)
  const previewRoute = routeFor(previewStops)

  const fromStartKm = ride.origin && requestedPoint ? distanceKm(ride.origin, requestedPoint) : null
  const extraKm = currentRoute && previewRoute ? Math.max(0, previewRoute.distanceKm - currentRoute.distanceKm) : null
  const extraMin = currentRoute && previewRoute ? Math.max(0, Math.round(previewRoute.durationMin - currentRoute.durationMin)) : null

  async function handleAccept() {
    if (await accept()) onDecision(RequestStatus.Accepted)
  }

  async function handleDecline() {
    if (await decline()) onDecision(RequestStatus.Declined)
  }

  return (
    <section aria-label="Rider request details" className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-black/10 sm:p-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">Rider request</p>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mist font-serif text-lg font-semibold text-ink">
          {request.rider_username.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold tracking-tight">
            {request.rider_username} <span className="font-normal text-subtle">wants to join your ride</span>
          </p>
          <p className="mt-1 text-sm text-ink">
            <span className="text-subtle">Requested pickup: </span>
            {requestedPoint
              ? (pickupName ?? `${requestedPoint[1].toFixed(4)}, ${requestedPoint[0].toFixed(4)}`)
              : 'Pickup location unavailable'}
          </p>
          {fromStartKm !== null && (
            <p className="mt-0.5 text-sm text-subtle">{formatDistance(fromStartKm)} from your starting point</p>
          )}
          {requestedPoint && previewRoute && (
            <p className="mt-0.5 text-sm text-subtle">
              Total route with pickup: {formatDistance(previewRoute.distanceKm)}, about {formatDuration(previewRoute.durationMin)}
              {extraKm !== null &&
                (extraKm < 0.15
                  ? ' · Right along your route'
                  : ` · +${formatDistance(extraKm)}${extraMin && extraMin > 0 ? `, +${formatDuration(extraMin)}` : ''} detour`)}
            </p>
          )}
        </div>
      </div>

      {decision ? (
        <p role="status" className="mt-5 flex flex-wrap items-center gap-3 border-t border-black/5 pt-4 text-sm">
          <RequestStatusBadge status={decision} />
          {decision === RequestStatus.Accepted
            ? `${request.rider_username} has been added to your ride.`
            : `You declined ${request.rider_username}'s request.`}
        </p>
      ) : (
        <div className="mt-5 flex gap-3 border-t border-black/5 pt-4 sm:justify-end">
          <button
            type="button"
            onClick={handleDecline}
            disabled={busy !== null}
            className={`${secondaryButton} flex-1 disabled:opacity-60 sm:flex-none`}
          >
            {busy === 'decline' ? 'Declining…' : 'Decline'}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={busy !== null}
            className={`${primaryButton} flex-1 disabled:opacity-60 sm:flex-none`}
          >
            {busy === 'accept' ? 'Accepting…' : 'Accept'}
            <Icon className="h-4 w-4">{icons.check}</Icon>
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className={`${errorNotice} mt-4`}>
          {error}
        </p>
      )}
    </section>
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
  const [pickup, setPickup] = useState('')
  const [pickupPlace, setPickupPlace] = useState<Place | null>(null)

  if (loading) return <div aria-label="Checking your requests" className="mt-8 h-12 animate-pulse rounded-full bg-mist" />
  if (status) {
    return (
      <>
        <p role="status" className="mt-8 flex flex-wrap items-center gap-3 text-[15px]">
          <RequestStatusBadge status={status} />
          {statusMessages[status]}
        </p>
        {status === RequestStatus.Accepted && <GroupChatButton rideId={rideId} />}
      </>
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
      <AddressInput
        label="Pick me up at"
        placeholder="Address, intersection or landmark"
        value={pickup}
        selectedPoint={pickupPlace?.coordinates}
        // Typing after picking means it's plain text again (the best match is used).
        onChange={(text) => {
          setPickup(text)
          setPickupPlace(null)
        }}
        onSelect={(place) => {
          setPickup(place.label)
          setPickupPlace(place)
        }}
      />
      <button type="button" onClick={() => request(pickup, pickupPlace)} disabled={sending} className={`${primaryButton} w-full disabled:opacity-60`}>
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

// Opened by clicking another driver's ride on the dashboard (/rides/:rideId) or "Preview ride" on
// Notifications (/rides/:rideId?request=:requestId).
export default function RideDetailsPage() {
  const { rideId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const previewRequestId = searchParams.get('request')
  const navState = location.state as { from?: string; request?: RideRequestDetails } | null
  const isPreview = Boolean(previewRequestId)
  const fromNotifications = isPreview || searchParams.get('from') === 'notifications' || navState?.from === 'notifications'

  const { ride, origin, loading, error } = useRide(rideId)
  const from = usePlaceName(origin)
  const isOwn = ride !== null && ride.driverId === getUser()?.id

  const { pendingRequests } = useUpdates()
  const livePreviewRequest = previewRequestId
    ? (pendingRequests.find((item) => item.id === previewRequestId && item.ride_id === rideId) ?? null)
    : null
  const statePreviewRequest =
    previewRequestId && navState?.request?.id === previewRequestId && navState.request.ride_id === rideId
      ? navState.request
      : null

  const [answered, setAnswered] = useState<{
    request: RideRequestDetails
    status: Decision
  } | null>(null)
  const currentAnswered = answered?.request.id === previewRequestId ? answered : null
  const previewRequest = currentAnswered?.request ?? livePreviewRequest ?? statePreviewRequest

  // Existing accepted riders' pickups (available when the signed-in user drives or rides on this ride).
  const [rideWithExistingPickups] = usePickups(ride ? [{ ...ride, from: from ?? ride.from }] : [], ride ? [ride.id] : [])
  const existingPickups = rideWithExistingPickups?.pickups ?? []

  // Combine existing accepted stops with the pending rider's requested pickup in stop order (furthest from campus first).
  const destination = ride?.destination ?? DESTINATION_POINT
  const requestedPoint = previewRequest?.detour_point?.coordinates ?? null
  const combinedPickups: Pickup[] =
    requestedPoint && currentAnswered?.status !== RequestStatus.Declined
      ? [
          ...existingPickups.filter((pickup) => pickup.riderId !== previewRequest!.rider_id),
          {
            riderId: previewRequest!.rider_id,
            point: requestedPoint,
            preview: currentAnswered?.status !== RequestStatus.Accepted,
            riderName: previewRequest!.rider_username,
          },
        ].sort((a, b) => distanceKm(b.point, destination) - distanceKm(a.point, destination))
      : existingPickups

  const mapRide: Ride | null = ride
    ? { ...ride, from: from ?? ride.from, pickups: combinedPickups.length > 0 ? combinedPickups : undefined }
    : null

  const backTo = fromNotifications ? '/notifications' : '/dashboard'
  const backLabel = fromNotifications ? 'Back to notifications' : 'Back to rides'

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm font-medium text-subtle transition-colors duration-300 hover:text-ink"
        >
          <Icon className="h-4 w-4 rotate-180">{icons.chevron}</Icon>
          {backLabel}
        </Link>

        <h1 className={`mt-6 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          {isPreview ? (
            <>
              Preview <em className="text-subtle">ride.</em>
            </>
          ) : (
            <>
              Ride to <em className="text-subtle">campus.</em>
            </>
          )}
        </h1>

        {loading ? (
          <div aria-label="Loading ride" className="mt-10 h-48 animate-pulse rounded-3xl bg-mist" />
        ) : !ride ? (
          <div role="alert" className="mt-10 rounded-3xl bg-mist px-6 py-12 text-center">
            <p className="text-lg font-medium">{error}</p>
            <Link to={backTo} className={`${primaryButton} mt-6`}>
              {backLabel}
              <Icon className="h-4 w-4">{icons.arrow}</Icon>
            </Link>
          </div>
        ) : (
          <>
            {/* Driver start, existing accepted pickups, any previewed requested pickup, campus, and route. */}
            <div className="mt-10 h-64 overflow-hidden rounded-3xl bg-mist ring-1 ring-black/10 sm:h-80">
              <LazyRideMap rides={mapRide ? [mapRide] : []} />
            </div>

            {isPreview && previewRequest && (
              <RequestPreviewSection
                request={previewRequest}
                ride={{ ...ride, from: from ?? ride.from }}
                existingPickups={existingPickups}
                decision={currentAnswered?.status ?? null}
                onDecision={(status) => setAnswered({ request: previewRequest, status })}
              />
            )}

            <RideSummary
              ride={{
                ...ride,
                from: from ?? ride.from,
                seatsLeft:
                  currentAnswered?.status === RequestStatus.Accepted ? Math.max(0, ride.seatsLeft - 1) : ride.seatsLeft,
              }}
              acceptedCount={
                existingPickups.length + (currentAnswered?.status === RequestStatus.Accepted ? 1 : 0)
              }
              heading={isPreview ? 'Existing ride details' : undefined}
            />

            {isOwn ? <OwnRide rideId={ride.id} /> : <RequestSeat rideId={ride.id} full={ride.seatsLeft === 0} />}
          </>
        )}
      </main>
    </div>
  )
}
