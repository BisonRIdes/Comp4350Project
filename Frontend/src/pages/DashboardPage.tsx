import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { AddressInput } from '../components/AddressInput'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { RideCard, type Ride } from '../components/RideCard'
import { RideDetailsModal } from '../components/RideDetailsModal'
import { LazyRideMap } from '../components/LazyRideMap'
import { YourSeats } from '../components/YourSeats'
import { headingClass } from '../styles'
import { useOpenRide } from '../hooks/useOpenRide'
import { useRides } from '../hooks/useRides'
import { distanceKm, type Place } from '../lib/places'

// fromPlace / toPlace are set when that field was picked from the suggestions; then rides are
// matched by distance instead of by name.
type Search = { from: string; to: string; departure: string; fromPlace: Place | null; toPlace: Place | null }
const emptySearch: Search = { from: '', to: '', departure: '', fromPlace: null, toPlace: null }

// How far from a picked address a ride can start (or end) and still show up.
const NEARBY_KM = 5

function matchesSearch(ride: Ride, search: Search) {
  const contains = (value: string | undefined, query: string) =>
    (value ?? '').toLowerCase().includes(query.trim().toLowerCase())
  const near = (point: readonly number[] | undefined, place: Place) =>
    point !== undefined && distanceKm(point, place.coordinates) <= NEARBY_KM

  if (search.fromPlace) {
    if (!near(ride.origin, search.fromPlace)) return false
  } else if (search.from && !contains(ride.from, search.from)) return false
  if (search.toPlace) {
    if (!near(ride.destination, search.toPlace)) return false
  } else if (search.to && !contains(ride.to, search.to)) return false
  if (search.departure) {
    const wanted = new Date(search.departure)
    const leaves = new Date(ride.departure)
    if (leaves.toDateString() !== wanted.toDateString() || leaves < wanted) return false
  }
  return true
}

// Matching rides; nearest first when searching from a picked address.
function findRides(rides: Ride[], search: Search) {
  const found = rides.filter((ride) => matchesSearch(ride, search))
  const place = search.fromPlace
  if (!place) return found
  return found.sort((a, b) => distanceKm(a.origin!, place.coordinates) - distanceKm(b.origin!, place.coordinates))
}

function describeSearch(search: Search) {
  const from = search.fromPlace ? `Near ${search.fromPlace.name}` : search.from
  const to = search.toPlace ? `near ${search.toPlace.name}` : search.to
  const route = [from || 'Anywhere', to || 'Anywhere'].join(' → ')
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
  const { rides: allRides, loading, error: loadError } = useRides()
  const { selectedRide, openRide, closeRide, isOwn } = useOpenRide()
  const [form, setForm] = useState<Search>(emptySearch)
  const [activeSearch, setActiveSearch] = useState<Search | null>(null)

  const rides = activeSearch ? findRides(allRides, activeSearch) : allRides

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
          // No overflow-hidden: the address suggestions drop down past the bar.
          className="relative z-10 mt-8 grid rounded-3xl bg-white ring-1 ring-black/10 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.25)] md:grid-cols-[1fr_1fr_1fr_auto] md:items-center md:rounded-full md:p-1.5"
        >
          <AddressInput
            variant="search"
            label="From"
            placeholder="Starting point"
            value={form.from}
            // Typing after picking means it's plain text again (matched by name).
            onChange={(text) => setForm({ ...form, from: text, fromPlace: null })}
            onSelect={(place) => setForm({ ...form, from: place.label, fromPlace: place })}
          />
          <div className="border-t border-black/10 md:border-l md:border-t-0">
            <AddressInput
              variant="search"
              label="To"
              placeholder="Destination"
              value={form.to}
              onChange={(text) => setForm({ ...form, to: text, toPlace: null })}
              onSelect={(place) => setForm({ ...form, to: place.label, toPlace: place })}
            />
          </div>
          <div className="border-t border-black/10 md:border-l md:border-t-0">
            <SearchField
              label="Departure (optional)"
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

        {/* After a search, show where the matching rides start. Clicking a dot opens that ride. */}
        {activeSearch && !loading && !loadError && rides.length > 0 && (
          <div className="mt-8 h-72 overflow-hidden rounded-3xl bg-mist ring-1 ring-black/10 sm:h-96">
            <LazyRideMap
              rides={rides}
              onSelect={openRide}
              searchPlaces={[activeSearch.fromPlace, activeSearch.toPlace].filter((place) => place !== null)}
              searchRadiusKm={NEARBY_KM}
            />
          </div>
        )}

        <YourSeats rides={allRides} />

        <section className="mt-14">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">Available rides</h2>
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
              {rides.map((ride) => (
                <li key={ride.id}>
                  <RideCard ride={ride} isOwn={isOwn(ride)} onClick={() => openRide(ride)} />
                </li>
              ))}
            </ul>
          ) : (
            <div role="status" className="mt-6 rounded-3xl bg-mist px-6 py-16 text-center">
              <p className="text-lg font-medium">Sorry, there are no rides available.</p>
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

      {selectedRide && <RideDetailsModal ride={selectedRide} onClose={closeRide} />}
    </div>
  )
}