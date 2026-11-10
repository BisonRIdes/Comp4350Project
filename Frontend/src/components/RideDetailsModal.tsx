import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { Icon } from './Icon'
import { icons } from './icons'
import { LazyRideMap } from './LazyRideMap'
import type { Ride } from './RideCard'
import { dateFormat, timeFormat } from '../lib/format'

// One labelled value in the details grid, e.g. "Seats left / 3".
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-mist px-4 py-3">
      <dt className="text-xs font-medium text-subtle">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-medium text-ink">{children}</dd>
    </div>
  )
}

// Pop-up with the full details of one ride. Uses <dialog> so Escape, focus trapping
// and the dimmed backdrop come from the browser.
export function RideDetailsModal({ ride, onClose }: { ride: Ride; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // A click on the dialog element itself (not its content) means the backdrop was clicked.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) dialogRef.current.close()
  }

  const departure = new Date(ride.departure)
  const driver = ride.driver ?? 'Driver'

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleClick}
      aria-labelledby="ride-details-title"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-3xl bg-white p-0 text-ink shadow-[0_40px_120px_-30px_rgba(0,0,0,0.45)] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-4 sm:p-6">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="absolute right-6 top-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-subtle shadow-sm ring-1 ring-black/10 transition-colors duration-300 hover:text-ink sm:right-8 sm:top-8"
        >
          <Icon className="h-4 w-4">{icons.close}</Icon>
        </button>

        <div className="h-56 overflow-hidden rounded-2xl bg-mist sm:h-72">
          <LazyRideMap rides={[ride]} />
        </div>

        <div className="mt-6 px-1">
          <h2 id="ride-details-title" className="text-2xl font-semibold tracking-tight">
            {ride.from ?? 'Starting point'} → {ride.to ?? 'Destination'}
          </h2>
          <p className="mt-1 text-subtle">
            {dateFormat.format(departure)} · {timeFormat.format(departure)}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mist font-serif text-lg font-semibold">
              {driver.charAt(0)}
            </span>
            <div>
              <p className="font-medium">{driver}</p>
              {ride.rating !== undefined && (
                <p className="flex items-center gap-1 text-sm text-subtle">
                  <Icon className="h-3.5 w-3.5">{icons.star}</Icon>
                  {ride.rating.toFixed(1)}
                </p>
              )}
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Detail label="Seats left">{ride.seatsLeft}</Detail>
            {ride.price !== undefined && <Detail label="Price per seat">${ride.price.toFixed(2)}</Detail>}
            {ride.car && <Detail label="Car">{ride.car}</Detail>}
          </dl>
        </div>
      </div>
    </dialog>
  )
}
