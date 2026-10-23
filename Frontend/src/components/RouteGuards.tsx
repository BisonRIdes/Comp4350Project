import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { getUser } from '../lib/auth'

// Where to go after signing in: the page the visitor was sent away from, or the dashboard.
export type RedirectState = { from?: string } | null

// Pages for signed-in users. Visitors who aren't signed in go to the login page and come back afterwards.
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!getUser()) {
    return <Navigate to="/login" replace state={{ from: location.pathname } satisfies RedirectState} />
  }
  return children
}

// Log in and sign up pages. Someone who is already signed in goes straight to the dashboard.
export function GuestOnly({ children }: { children: ReactNode }) {
  if (getUser()) return <Navigate to="/dashboard" replace />
  return children
}
