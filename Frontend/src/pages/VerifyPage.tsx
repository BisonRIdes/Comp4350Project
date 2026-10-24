import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AuthLayout } from '../components/AuthLayout'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { apiFetch } from '../lib/api'
import { primaryButton } from '../styles'

type Status = 'ready' | 'verifying' | 'verified' | 'failed'

const subtitles: Record<Status, string> = {
  ready: 'Confirm this is your student email to finish creating your account.',
  verifying: 'Confirming your email…',
  verified: 'Your student email is verified. You can log in now.',
  failed: 'This link is invalid or has expired. Log in with your email and password to get a new one.',
}

// Opened from the link in the verification email: /verify?token=...
// Verifying waits for a click: email security scanners open every link in an email, and if the page
// verified on load, a scanner could verify an account the student never asked for.
export default function VerifyPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>(token ? 'ready' : 'failed')

  async function confirmEmail() {
    setStatus('verifying')
    try {
      const response = await apiFetch('/auth/verify', { method: 'POST', body: JSON.stringify({ token }) })
      setStatus(response.ok ? 'verified' : 'failed')
    } catch {
      setStatus('failed')
    }
  }

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
      {status === 'ready' || status === 'verifying' ? (
        <button
          type="button"
          onClick={confirmEmail}
          disabled={status === 'verifying'}
          className={`${primaryButton} w-full disabled:opacity-60`}
        >
          {status === 'verifying' ? 'Confirming…' : 'Confirm my email'}
          <Icon className="h-4 w-4">{icons.arrow}</Icon>
        </button>
      ) : (
        <Link to="/login" className={`${primaryButton} w-full`}>
          {status === 'verified' ? 'Log in' : 'Go to log in'}
          <Icon className="h-4 w-4">{icons.arrow}</Icon>
        </Link>
      )}
    </AuthLayout>
  )
}
