import { Icon } from './Icon'
import { icons } from './icons'
import { dateFormat, timeFormat } from '../lib/format'

// Optional fields aren't returned by GET /rides yet; the card hides them when missing.
export type Ride = {
  id: string
  driverId: string
  from?: string
  to?: string
  origin?: [number, number] // GeoJSON order: [longitude, latitude]
  destination?: [number, number] // same order
  departure: string // ISO date string
  driver?: string
  rating?: number
  car?: string
  price?: number
  seatsLeft: number
}

// One row in "Available rides": driver | route + time | car | price + seats.
// isOwn marks the signed-in driver's own ride. onClick runs when the card is clicked.
// compact keeps the narrow phone layout at every width (for the list beside the map);
// highlighted outlines the card, e.g. while its dot on the map is hovered.
type RideCardProps = { ride: Ride; isOwn?: boolean; onClick?: () => void; compact?: boolean; highlighted?: boolean }

export function RideCard({ ride, isOwn = false, onClick, compact = false, highlighted = false }: RideCardProps) {
  const departure = new Date(ride.departure)
  const driver = ride.driver ?? 'Driver'
  const route = ride.from && ride.to ? `${ride.from} → ${ride.to}` : `Ride on ${dateFormat.format(departure)}`

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl bg-white p-4 text-left transition-[transform,box-shadow] duration-500 ease-smooth hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${highlighted ? 'ring-2 ring-ink' : 'ring-1 ring-black/10'} ${compact ? '' : 'sm:grid-cols-[7rem_1fr_1fr_auto] sm:gap-6 sm:p-5'}`}
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mist font-serif text-lg font-semibold text-ink">
          {driver.charAt(0)}
        </span>
        <span className="mt-1.5 text-sm font-medium">{driver}</span>
        {ride.rating !== undefined && (
          <span className="flex items-center gap-1 text-xs text-subtle">
            <Icon className="h-3 w-3">{icons.star}</Icon>
            {ride.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[17px] font-semibold tracking-tight">{route}</p>
        {isOwn && <span className="mt-1 inline-block rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-ink">Your ride · tap to edit</span>}
        <p className="mt-0.5 text-sm text-subtle">
          {dateFormat.format(departure)} · {timeFormat.format(departure)}
        </p>
        {ride.car && <p className={`mt-0.5 text-sm text-subtle ${compact ? '' : 'sm:hidden'}`}>{ride.car}</p>}
      </div>

      <div className={`hidden items-center gap-2 text-sm text-subtle ${compact ? '' : 'sm:flex'}`}>
        {ride.car && (
          <>
            <Icon className="h-4 w-4 shrink-0">{icons.car}</Icon>
            {ride.car}
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          {ride.price !== undefined && <p className="text-lg font-semibold tabular-nums">${ride.price.toFixed(2)}</p>}
          <p className="text-xs text-subtle">
            {ride.seatsLeft} {ride.seatsLeft === 1 ? 'seat' : 'seats'} left
          </p>
        </div>
        <Icon className={`hidden h-5 w-5 text-neutral-300 transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:text-ink ${compact ? '' : 'sm:block'}`}>
          {icons.chevron}
        </Icon>
      </div>
    </button>
  )
}