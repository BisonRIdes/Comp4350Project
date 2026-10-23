import { Icon } from './Icon'
import { icons } from './icons'

export type Ride = {
  id: string
  from: string
  to: string
  departure: string // ISO date string
  driver: string
  rating: number
  car: string
  price: number
  seatsLeft: number
}

const dateFormat = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' })

// One row in "Available rides": driver | route + time | car | price + seats.
export function RideCard({ ride }: { ride: Ride }) {
  const departure = new Date(ride.departure)

  return (
    <button
      type="button"
      // TODO: open the ride details page once it exists.
      className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl bg-white p-4 text-left ring-1 ring-black/10 transition-[transform,box-shadow] duration-500 ease-smooth hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink sm:grid-cols-[7rem_1fr_1fr_auto] sm:gap-6 sm:p-5"
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mist font-serif text-lg font-semibold text-ink">
          {ride.driver.charAt(0)}
        </span>
        <span className="mt-1.5 text-sm font-medium">{ride.driver}</span>
        <span className="flex items-center gap-1 text-xs text-subtle">
          <Icon className="h-3 w-3">{icons.star}</Icon>
          {ride.rating.toFixed(1)}
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[17px] font-semibold tracking-tight">
          {ride.from} → {ride.to}
        </p>
        <p className="mt-0.5 text-sm text-subtle">
          {dateFormat.format(departure)} · {timeFormat.format(departure)}
        </p>
        <p className="mt-0.5 text-sm text-subtle sm:hidden">{ride.car}</p>
      </div>

      <div className="hidden items-center gap-2 text-sm text-subtle sm:flex">
        <Icon className="h-4 w-4 shrink-0">{icons.car}</Icon>
        {ride.car}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums">${ride.price.toFixed(2)}</p>
          <p className="text-xs text-subtle">
            {ride.seatsLeft} {ride.seatsLeft === 1 ? 'seat' : 'seats'} left
          </p>
        </div>
        <Icon className="hidden h-5 w-5 text-neutral-300 transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:text-ink sm:block">
          {icons.chevron}
        </Icon>
      </div>
    </button>
  )
}
