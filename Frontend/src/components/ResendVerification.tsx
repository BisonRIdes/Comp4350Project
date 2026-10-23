import { useState } from 'react'
import { apiFetch } from '../lib/api'

type Status = 'idle' | 'sending' | 'sent' | 'failed'

// Asks the backend to email a new verification link. The backend answers the same way whether or not
// the account exists (so nobody can check who signed up), so this only reports whether the request went through.
export function ResendVerification({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>('idle')

  async function resend() {
    setStatus('sending')
    try {
      const response = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setStatus(response.ok ? 'sent' : 'failed')
    } catch {
      setStatus('failed')
    }
  }

  if (status === 'sent') {
    return <span>We sent a new link to {email}.</span>
  }
  return (
    <button
      type="button"
      onClick={resend}
      disabled={status === 'sending'}
      className="font-medium text-ink underline-offset-4 hover:underline disabled:opacity-60"
    >
      {status === 'sending' ? 'Sending…' : status === 'failed' ? "Couldn't send it. Try again" : 'Send a new link'}
    </button>
  )
}
