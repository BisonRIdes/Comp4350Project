import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { RideCard, type Ride } from '../components/RideCard'
import { SeatActions } from '../components/SeatActions'
import { RequestStatus } from '../constants'
import { headingClass } from '../styles'
import { useMyRequests } from '../hooks/useMyRequests'
import { useRides } from '../hooks/useRides'
import { useSeatPayments } from '../hooks/useSeatPayments'
import { useNavigate, useSearchParams } from 'react-router'
import { getUser } from '../lib/auth'

type Search = { from: string; to: string; departure: string }
const emptySearch: Search = { from: '', to: '', departure: '' }

// What "Filter by" shows. Kept in the URL (?view=seats) so a refresh or a link opens the same list.
type View = 'all' | 'seats' | 'rides'
const viewTitles: Record<View, string> = { all: 'Available rides', seats: 'My seats', rides: 'My rides' }
const emptyMessages: Record<View, string> = {
  all: 'Sorry, there are no rides available.',
  seats: "You don't have any upcoming seats.",
  rides: "You haven't posted any upcoming rides.",
}

// Only drivers have rides of their own, so anything unknown falls back to every ride.
function toView(requested: string | null, isDriver: boolean): View {
  if (requested === 'seats') return 'seats'
  if (requested === 'rides' && isDriver) return 'rides'
  return 'all'
}

function matchesSearch(ride: Ride, search: Search) {
  const contains = (value: string | undefined, query: string) =>
    (value ?? '').toLowerCase().includes(query.trim().toLowerCase())
  if (search.from && !contains(ride.from, search.from)) return false
  if (search.to && !contains(ride.to, search.to)) return false
  if (search.departure) {
    const wanted = new Date(search.departure)
    const leaves = new Date(ride.departure)
    if (leaves.toDateString() !== wanted.toDateString() || leaves < wanted) return false
  }
  return true
}

function describeSearch(search: Search) {
  const route = [search.from || 'Anywhere', search.to || 'Anywhere'].join(' → ')
  if (!search.departure) return route
  const time = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return `${route} · ${time.format(new Date(search.departure))}`
}

// One segment of the search bar: small label above a borderless input.
function SearchField({ label, ...inputProps }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block cursor-text px-5 py-3 transition-colors duration-300 hover:bg-mist md:rounded-full">
      <span className="block text-xs font-medium text-ink">{label}</span>
      <input
        className="mt-0.5 w-full bg-transparent text-[15px] text-ink placeholder:text-neutral-400 focus:outline-none"
        {...inputProps}
      />
    </label>
  )
}

export default function DashboardPage() {
  const { rides: allRides, loading: ridesLoading, error: ridesError, reload: reloadRides } = useRides()
  const navigate = useNavigate()
  const user = getUser()
  const [form, setForm] = useState<Search>(emptySearch)
  const [activeSearch, setActiveSearch] = useState<Search | null>(null)
  const [params, setParams] = useSearchParams()
  const { active: seats, loading: seatsLoading, error: seatsError, cancel } = useMyRequests()
  const payments = useSeatPayments(
    seats.filter((seat) => seat.status === RequestStatus.Accepted).map((seat) => seat.id),
  )

  // Every view is the same list of rides, so search and the cards work the same way in all three.
  const view = toView(params.get('view'), user?.is_driver ?? false)
  const seatOnRide = new Map(seats.map((seat) => [seat.ride_id, seat]))
  const listed =
    view === 'seats'
      ? allRides.filter((ride) => seatOnRide.has(ride.id))
      : view === 'rides'
        ? allRides.filter((ride) => ride.driverId === user?.id)
        : allRides
  const rides = activeSearch ? listed.filter((ride) => matchesSearch(ride, activeSearch)) : listed
  const loading = ridesLoading || (view === 'seats' && seatsLoading)
  const loadError = ridesError || (view === 'seats' ? seatsError : '')
  const unpaid = payments.filter((payment) => payment.status !== 'paid' && payment.amount_cents !== null).length

  // A seat just came free, so show the new seats left now instead of after the next reload.
  async function cancelSeat(requestId: string) {
    const message = await cancel(requestId)
    reloadRides()
    return message
  }

  function changeView(next: View) {
    setParams(next === 'all' ? {} : { view: next })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const isEmpty = !form.from.trim() && !form.to.trim() && !form.departure
    setActiveSearch(isEmpty ? null : form)
  }

  // The ✕ on the search chip: clear the search and go back to all rides.
  function clearSearch() {
    setActiveSearch(null)
    setForm(emptySearch)
  }

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Where are you <em className="text-subtle">headed?</em>
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid overflow-hidden rounded-3xl bg-white ring-1 ring-black/10 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.25)] md:grid-cols-[1fr_1fr_1fr_auto] md:items-center md:rounded-full md:p-1.5"
        >
          <SearchField
            label="From"
            placeholder="Starting point"
            value={form.from}
            onChange={(event) => setForm({ ...form, from: event.target.value })}
          />
          <div className="border-t border-black/10 md:border-l md:border-t-0">
            <SearchField
              label="To"
              placeholder="Destination"
              value={form.to}
              onChange={(event) => setForm({ ...form, to: event.target.value })}
            />
          </div>
          <div className="border-t border-black/10 md:border-l md:border-t-0">
            <SearchField
              label="Departure"
              type="datetime-local"
              value={form.departure}
              onChange={(event) => setForm({ ...form, departure: event.target.value })}
            />
          </div>
          <div className="border-t border-black/10 p-3 md:border-0 md:p-0">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-white transition duration-300 ease-smooth hover:bg-black active:scale-[0.97]"
            >
              <Icon className="h-4 w-4">{icons.search}</Icon>
              Search
            </button>
          </div>
        </form>

        <section className="mt-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{viewTitles[view]}</h2>
              {activeSearch && (
                <span className="inline-flex items-center gap-1 rounded-full bg-mist py-1 pl-4 pr-1 text-sm text-ink">
                  {describeSearch(activeSearch)}
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-subtle transition-colors duration-300 hover:bg-white hover:text-ink"
                  >
                    <Icon className="h-4 w-4">{icons.close}</Icon>
                  </button>
                </span>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-subtle">
              Filter by:
              {/* The browser's own arrow sits right on the edge, so it's hidden and our chevron is drawn instead. */}
              <span className="relative">
                <select
                  value={view}
                  onChange={(event) => changeView(event.target.value as View)}
                  className="appearance-none rounded-full bg-mist py-2 pl-4 pr-10 text-sm font-medium text-ink ring-1 ring-transparent transition duration-300 hover:ring-black/10 focus:outline-none focus:ring-2 focus:ring-ink"
                >
                  <option value="all">All available rides</option>
                  <option value="seats">My seats</option>
                  {user?.is_driver && <option value="rides">My rides</option>}
                </select>
                <Icon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-subtle">
                  {icons.chevron}
                </Icon>
              </span>
            </label>
          </div>

          {/* Riders with a seat see it straight away, without the list changing under them. */}
          {view === 'all' && seats.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-mist px-5 py-4 text-sm">
              <p className="text-ink">
                You have {seats.length} upcoming {seats.length === 1 ? 'seat' : 'seats'}
                {unpaid > 0 && <span className="text-subtle"> · {unpaid} waiting for payment</span>}
              </p>
              <button
                type="button"
                onClick={() => changeView('seats')}
                className="inline-flex items-center gap-1 font-medium text-ink underline-offset-4 hover:underline"
              >
                View my seats
                <Icon className="h-4 w-4">{icons.arrow}</Icon>
              </button>
            </div>
          )}

          {loading ? (
            <ul className="mt-6 space-y-3" aria-label="Loading rides">
              {[0, 1, 2].map((key) => (
                <li key={key} className="h-[104px] animate-pulse rounded-3xl bg-mist" />
              ))}
            </ul>
          ) : loadError ? (
            <p role="alert" className="mt-6 rounded-3xl bg-danger/5 px-6 py-10 text-center font-medium text-danger ring-1 ring-danger/20">
              {loadError}
            </p>
          ) : rides.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {rides.map((ride) => {
                const seat = view === 'seats' ? seatOnRide.get(ride.id) : undefined
                return (
                  <li key={ride.id}>
                    <RideCard
                      ride={ride}
                      isOwn={ride.driverId === user?.id}
                      // Drivers edit their own rides; everyone else opens the ride to request a seat.
                      onClick={() => navigate(ride.driverId === user?.id ? `/rides/${ride.id}/edit` : `/rides/${ride.id}`)}
                      footer={
                        seat && (
                          <SeatActions
                            status={seat.status}
                            payment={payments.find((payment) => payment.request_id === seat.id)}
                            onCancel={() => cancelSeat(seat.id)}
                          />
                        )
                      }
                    />
                  </li>
                )
              })}
            </ul>
          ) : (
            <div role="status" className="mt-6 rounded-3xl bg-mist px-6 py-16 text-center">
              <p className="text-lg font-medium">{emptyMessages[view]}</p>
              {activeSearch && (
                <>
                  <p className="mt-2 text-subtle">Try a different route or time, or clear your search to see every ride.</p>
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="mt-6 text-sm font-medium text-ink underline-offset-4 hover:underline"
                  >
                    Show all rides
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
