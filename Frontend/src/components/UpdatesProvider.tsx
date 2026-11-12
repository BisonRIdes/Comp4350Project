import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { UPDATES_POLL_MS } from '../constants'
import { UpdatesContext } from '../hooks/useUpdates'
import { getUser } from '../lib/auth'
import { fetchUpdates, type Updates } from '../lib/rideRequests'

// The latest GET /updates answer and whose it is, so someone who logs in never sees the last user's.
type Result = { userId: string; updates: Updates; error: string }

const noUpdates: Updates = { pending_requests: [], request_updates: [] }

// Checks GET /updates every few seconds while someone is signed in. Every page shares this one poll.
export function UpdatesProvider({ children }: { children: ReactNode }) {
  // Signing in or out always moves to another page, so re-reading the user on navigation keeps it current.
  useLocation()
  const userId = getUser()?.id
  const [result, setResult] = useState<Result | null>(null)

  // State is only set in the .then callbacks, once the answer arrives, never during the effect itself.
  const refresh = useCallback(async () => {
    if (!userId) return
    await fetchUpdates().then(
      (updates) => setResult({ userId, updates, error: '' }),
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
  const value = {
    pendingRequests: current?.updates.pending_requests ?? [],
    requestUpdates: current?.updates.request_updates ?? [],
    loading: Boolean(userId) && !current,
    error: current?.error ?? '',
    refresh,
  }
  return <UpdatesContext value={value}>{children}</UpdatesContext>
}
