import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { UPDATES_POLL_MS } from '../constants'
import { UpdatesContext } from '../hooks/useUpdates'
import { getUser } from '../lib/auth'
import { fetchUpdates, type Updates } from '../lib/rideRequests'
import { readSeenDecisions, writeSeenDecisions } from '../lib/seenDecisions'

// The latest GET /updates answer and whose it is, so someone who logs in never sees the last user's.
type Result = { userId: string; updates: Updates; error: string }
// Request ids that belong to one user, for the same reason.
type UserIds = { userId: string; ids: string[] }

const noUpdates: Updates = { pending_requests: [], request_updates: [] }

// Checks GET /updates every few seconds while someone is signed in. Every page shares this one poll.
export function UpdatesProvider({ children }: { children: ReactNode }) {
  // Signing in or out always moves to another page, so re-reading the user on navigation keeps it current.
  useLocation()
  const userId = getUser()?.id
  const [result, setResult] = useState<Result | null>(null)
  // Answers the user has already seen, and the ones that were unread when they opened notifications.
  const [seen, setSeen] = useState<UserIds | null>(null)
  const [justSeen, setJustSeen] = useState<UserIds | null>(null)

  // State is only set in the .then callbacks, once the answer arrives, never during the effect itself.
  const refresh = useCallback(async () => {
    if (!userId) return
    await fetchUpdates().then(
      (updates) => {
        let seenIds = readSeenDecisions(userId)
        // First time on this browser: count today's answers as seen, so nobody opens the app to a pile of old ones.
        if (seenIds === null) {
          seenIds = updates.request_updates.map((request) => request.id)
          writeSeenDecisions(userId, seenIds)
        }
        setSeen({ userId, ids: seenIds })
        setResult({ userId, updates, error: '' })
      },
      // Keep showing the last updates that loaded; the next poll tries again.
      () =>
        setResult((previous) => ({
          userId,
          updates: previous?.userId === userId ? previous.updates : noUpdates,
          error: "Couldn't check for new requests. Trying again shortly.",
        })),
    )
  }, [userId])

  useEffect(() => {
    if (!userId) return
    refresh()
    // Skip checks while the tab is hidden, and catch up as soon as it's visible again.
    const timer = setInterval(() => {
      if (!document.hidden) refresh()
    }, UPDATES_POLL_MS)
    const handleVisibilityChange = () => {
      if (!document.hidden) refresh()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, refresh])

  const current = result?.userId === userId ? result : null
  const requestUpdates = current?.updates.request_updates ?? []
  // Check seen exists first: when nobody is logged in, userId and seen?.userId are both undefined.
  const seenIds = seen && seen.userId === userId ? seen.ids : []
  const unreadDecisions = requestUpdates.filter((request) => !seenIds.includes(request.id))

  // Opening notifications reads every answer there. The ones that were unread stay labelled "new" until a reload.
  function markDecisionsSeen() {
    if (!userId || unreadDecisions.length === 0) return
    const answered = requestUpdates.map((request) => request.id)
    const unreadIds = unreadDecisions.map((request) => request.id)
    writeSeenDecisions(userId, answered)
    setSeen({ userId, ids: answered })
    setJustSeen((previous) => ({
      userId,
      ids: [...(previous?.userId === userId ? previous.ids : []), ...unreadIds],
    }))
  }

  const value = {
    pendingRequests: current?.updates.pending_requests ?? [],
    requestUpdates,
    unreadDecisions,
    newDecisionIds: justSeen && justSeen.userId === userId ? justSeen.ids : [],
    loading: Boolean(userId) && !current,
    error: current?.error ?? '',
    refresh,
    markDecisionsSeen,
  }
  return <UpdatesContext value={value}>{children}</UpdatesContext>
}
