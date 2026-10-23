import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { RideCard, type Ride } from '../components/RideCard'
import { headingClass } from '../styles'
import { useRides } from '../hooks/useRides'

type Search = { from: string; to: string; departure: string }
const emptySearch: Search = { from: '', to: '', departure: '' }

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
  const { rides: allRides, loading, error: loadError } = useRides()
  const [form, setForm] = useState<Search>(emptySearch)
  const [activeSearch, setActiveSearch] = useState<Search | null>(null)

  const rides = activeSearch ? allRides.filter((ride) => matchesSearch(ride, activeSearch)) : allRides

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
            <p role="alert" className="mt-6 rounded-3xl bg-mist px-6 py-10 text-center text-subtle">
              {loadError}
            </p>
          ) : rides.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {rides.map((ride) => (
                <li key={ride.id}>
                  <RideCard ride={ride} />
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
    </div>
  )
}