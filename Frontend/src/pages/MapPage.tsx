import { useState } from 'react'
import { Link } from 'react-router'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { RideCard } from '../components/RideCard'
import { RideDetailsModal } from '../components/RideDetailsModal'
import { LazyRideMap } from '../components/LazyRideMap'
import { useOpenRide } from '../hooks/useOpenRide'
import { useRides } from '../hooks/useRides'
import { headingClass } from '../styles'

// Every upcoming ride: the list on the left, all of them on a map on the right (map on top on phones).
// Hovering a card highlights its dot and hovering a dot highlights its card; clicking either opens the ride.
export default function MapPage() {
  const { rides, loading, error } = useRides()
  const { selectedRide, openRide, closeRide, isOwn } = useOpenRide()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Rides on a <em className="text-subtle">map.</em>
        </h1>
        <p className="mt-3 text-lg text-subtle">
          {loading ? 'Loading rides…' : `${rides.length} upcoming ${rides.length === 1 ? 'ride' : 'rides'} to campus.`}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Map: right column on desktop, stays in view while the list scrolls. */}
          <div className="h-80 overflow-hidden rounded-3xl bg-mist ring-1 ring-black/10 sm:h-96 lg:sticky lg:top-24 lg:order-last lg:h-[calc(100svh-8rem)]">
            {!error && <LazyRideMap rides={rides} onSelect={openRide} highlightedId={hoveredId} onHover={setHoveredId} />}
          </div>

          <section aria-label="Upcoming rides">
            {loading ? (
              <ul className="space-y-3" aria-label="Loading rides">
                {[0, 1, 2].map((key) => (
                  <li key={key} className="h-26 animate-pulse rounded-3xl bg-mist" />
                ))}
              </ul>
            ) : error ? (
              <p role="alert" className="rounded-3xl bg-danger/5 px-6 py-10 text-center font-medium text-danger ring-1 ring-danger/20">
                {error}
              </p>
            ) : rides.length > 0 ? (
              <ul className="space-y-3">
                {rides.map((ride) => (
                  <li key={ride.id} onMouseEnter={() => setHoveredId(ride.id)} onMouseLeave={() => setHoveredId(null)}>
                    <RideCard
                      ride={ride}
                      compact
                      isOwn={isOwn(ride)}
                      highlighted={ride.id === hoveredId}
                      onClick={() => openRide(ride)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div role="status" className="rounded-3xl bg-mist px-6 py-16 text-center">
                <p className="text-lg font-medium">No upcoming rides yet.</p>
                <p className="mt-2 text-subtle">When drivers post rides, they'll show up here and on the map.</p>
                <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-ink underline-offset-4 hover:underline">
                  Back to the dashboard
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedRide && <RideDetailsModal ride={selectedRide} onClose={closeRide} />}
    </div>
  )
}
