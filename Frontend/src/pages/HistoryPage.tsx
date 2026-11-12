import { Link } from 'react-router'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { RequestUpdateCard } from '../components/RequestUpdateCard'
import { useMyRequests } from '../hooks/useMyRequests'
import { errorNotice, headingClass, primaryButton } from '../styles'

// /history, from the profile menu: every ride the user asked to join and what happened, whether it's
// still coming up or not. Seats that still need paying or cancelling are under Find Ride → My seats.
export default function HistoryPage() {
  const { history, loading, error } = useMyRequests()

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Request <em className="text-subtle">history.</em>
        </h1>
        <p className="mt-3 text-lg text-subtle">Every ride you've asked to join, and what the driver said.</p>

        {loading ? (
          <ul className="mt-10 space-y-3" aria-label="Loading request history">
            {[0, 1].map((key) => (
              <li key={key} className="h-[120px] animate-pulse rounded-3xl bg-mist" />
            ))}
          </ul>
        ) : error ? (
          <p role="alert" className={`${errorNotice} mt-10`}>
            {error}
          </p>
        ) : history.length > 0 ? (
          <ul className="mt-10 space-y-3">
            {history.map((request) => (
              <li key={request.id}>
                <RequestUpdateCard request={request} />
              </li>
            ))}
          </ul>
        ) : (
          <div role="status" className="mt-10 rounded-3xl bg-mist px-6 py-12 text-center">
            <p className="text-lg font-medium">You haven't requested any rides yet.</p>
            <Link to="/dashboard" className={`${primaryButton} mt-6`}>
              Find a ride
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
