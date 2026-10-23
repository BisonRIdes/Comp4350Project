import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AuthLayout } from '../components/AuthLayout'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { apiFetch } from '../lib/api'
import { primaryButton } from '../styles'

type Status = 'verifying' | 'verified' | 'failed'

const subtitles: Record<Status, string> = {
  verifying: 'Checking your verification link…',
  verified: 'Your student email is verified. You can log in now.',
  failed: 'This link is invalid or has expired. Log in with your email and password to get a new one.',
}

// Opened from the link in the verification email: /verify?token=...
export default function VerifyPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'failed')

  useEffect(() => {
    if (!token) return
    // Ignore the answer if the page closes first. Verifying twice is fine on the backend,
    // which matters because React runs this effect twice in development.
    let cancelled = false
    apiFetch('/auth/verify', { method: 'POST', body: JSON.stringify({ token }) })
      .then((response) => {
        if (!cancelled) setStatus(response.ok ? 'verified' : 'failed')
      })
      .catch(() => {
        if (!cancelled) setStatus('failed')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <AuthLayout
      title={
        <>
          Almost <em className="text-subtle">there.</em>
        </>
      }
      subtitle={subtitles[status]}
      footer={
        <>
          New to BisonRides?{' '}
          <Link to="/signup" className="font-medium text-ink underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
      panelTitle={
        <>
          Your ride to campus is <em className="text-subtle">waiting.</em>
        </>
      }
      panelText="Only University of Manitoba students can join, so you always know who you're riding with."
      panelCars={[{ tone: 'white', passengers: 3, x: 330, width: 540 }]}
    >
      {status === 'verifying' ? (
        <p role="status" className="rounded-xl bg-mist px-4 py-3 text-center text-sm text-subtle">
          Verifying…
        </p>
      ) : (
        <Link to="/login" className={`${primaryButton} w-full`}>
          {status === 'verified' ? 'Log in' : 'Go to log in'}
          <Icon className="h-4 w-4">{icons.arrow}</Icon>
        </Link>
      )}
    </AuthLayout>
  )
}
