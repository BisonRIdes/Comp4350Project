import { useEffect, type ReactNode } from 'react'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { IncomingRequestCard } from '../components/IncomingRequestCard'
import { RequestUpdateCard } from '../components/RequestUpdateCard'
import { useUpdates } from '../hooks/useUpdates'
import { getUser } from '../lib/auth'
import { errorNotice, headingClass } from '../styles'

// One titled list, or a short note when it's empty.
function Section({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {children.length > 0 ? (
        <ul className="mt-6 space-y-3">{children}</ul>
      ) : (
        <p role="status" className="mt-6 rounded-3xl bg-mist px-6 py-10 text-center text-subtle">
          {empty}
        </p>
      )}
    </section>
  )
}

// /notifications: requests waiting on the driver's rides, and answers to the rider's own requests.
// Both lists stay live through UpdatesProvider, so nothing here polls on its own.
export default function NotificationsPage() {
  const {
    pendingRequests,
    requestUpdates,
    unreadDecisions,
    newDecisionIds,
    loading,
    error,
    markDecisionsSeen,
    clearNewDecisions,
  } = useUpdates()
  const isDriver = getUser()?.is_driver ?? false

  // New answers first, latest arrival on top, then the rest in ride order. Requests have no timestamps,
  // so arrival order is only known for answers that came in while this browser was open.
  const newRank = (id: string) => newDecisionIds.indexOf(id)
  const newestFirst = [...requestUpdates].sort((a, b) => newRank(b.id) - newRank(a.id))

  // Being on this page counts as reading the answers, including ones that arrive while it's open.
  const unreadCount = unreadDecisions.length
  useEffect(() => {
    if (unreadCount > 0) markDecisionsSeen()
  }, [unreadCount, markDecisionsSeen])

  // "New" only means new on this visit, so the labels go when the user leaves the page.
  useEffect(() => clearNewDecisions, [clearNewDecisions])

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Your <em className="text-subtle">notifications.</em>
        </h1>

        {error && (
          <p role="alert" className={`${errorNotice} mt-8`}>
            {error}
          </p>
        )}

        {loading ? (
          <ul className="mt-10 space-y-3" aria-label="Loading notifications">
            {[0, 1].map((key) => (
              <li key={key} className="h-[120px] animate-pulse rounded-3xl bg-mist" />
            ))}
          </ul>
        ) : (
          <>
            {isDriver && (
              <Section title="New ride requests" empty="No requests waiting. New ones appear here automatically.">
                {pendingRequests.map((request) => (
                  <li key={request.id}>
                    <IncomingRequestCard request={request} />
                  </li>
                ))}
              </Section>
            )}
            <Section
              title="Updates on your requests"
              empty="No answers yet. When a driver accepts or declines your request, it shows up here."
            >
              {newestFirst.map((request) => (
                <li key={request.id}>
                  <RequestUpdateCard request={request} isNew={newDecisionIds.includes(request.id)} />
                </li>
              ))}
            </Section>
          </>
        )}
      </main>
    </div>
  )
}
