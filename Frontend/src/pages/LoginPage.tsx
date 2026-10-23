import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthLayout } from '../components/AuthLayout'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { ResendVerification } from '../components/ResendVerification'
import type { RedirectState } from '../components/RouteGuards'
import { TextField } from '../components/TextField'
import { apiFetch, readError } from '../lib/api'
import { saveSession, type CurrentUser } from '../lib/auth'
import { primaryButton } from '../styles'

type Errors = { email?: string; password?: string }
type LoginResponse = { access_token: string; user: CurrentUser }

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState('')
  // Set when the account exists but its email isn't verified yet, to offer a new link.
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  // Kept when switching to sign up, so the visitor still returns to the page they wanted.
  const location = useLocation()
  const redirectTo = (location.state as RedirectState)?.from ?? '/dashboard'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Errors = {}
    const trimmedEmail = email.trim()
    if (!trimmedEmail) nextErrors.email = 'Enter your student email.'
    if (!password) nextErrors.password = 'Enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setNotice('')
    setUnverifiedEmail('')
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password }),
      })
      if (response.status === 401) {
        setNotice('Wrong email or password.')
        return
      }
      if (response.status === 403) {
        setNotice('Verify your email first: open the link we sent to your student email.')
        setUnverifiedEmail(trimmedEmail)
        return
      }
      if (!response.ok) {
        setNotice(await readError(response))
        return
      }
      const { access_token, user }: LoginResponse = await response.json()
      saveSession(access_token, user)
      navigate(redirectTo, { replace: true })
    } catch {
      setNotice("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={
        <>
          Welcome <em className="text-subtle">back.</em>
        </>
      }
      subtitle="Log in to find a ride or offer one on your way to campus."
      footer={
        <>
          New to BisonRides?{' '}
          <Link to="/signup" state={location.state} className="font-medium text-ink underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
      panelTitle={
        <>
          Your ride to campus is <em className="text-subtle">waiting.</em>
        </>
      }
      panelText="Pick up where you left off and see who's heading to U of M today."
      panelCars={[{ tone: 'white', passengers: 3, x: 330, width: 540 }]}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Student email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@myumanitoba.ca"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <div>
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          {/* Hidden until a password reset flow exists.
          <div className="mt-2 text-right">
            <a href="#" className="text-[13px] text-subtle transition-colors duration-300 hover:text-ink">
              Forgot password?
            </a>
          </div>
          */}
        </div>
        <button type="submit" disabled={submitting} className={`${primaryButton} w-full disabled:opacity-60`}>
          {submitting ? 'Logging in…' : 'Log in'}
          <Icon className="h-4 w-4">{icons.arrow}</Icon>
        </button>
        {notice && (
          <p role="status" className="rounded-xl bg-mist px-4 py-3 text-center text-sm text-subtle">
            {notice}
            {unverifiedEmail && (
              <>
                {' '}
                <ResendVerification email={unverifiedEmail} />
              </>
            )}
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
