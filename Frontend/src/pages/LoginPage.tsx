import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '../components/AuthLayout'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { TextField } from '../components/TextField'
import { primaryButton } from '../styles'

type Errors = { identifier?: string; password?: string }

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Errors = {}
    if (!identifier.trim()) nextErrors.identifier = 'Enter your email or username.'
    if (!password) nextErrors.password = 'Enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // TODO: call POST /auth/login once the backend endpoint is implemented.
    setNotice("Logging in isn't connected to the server yet.")
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
      panelText="Pick up where you left off and see who's heading to U of M today."
      panelCars={[{ tone: 'white', passengers: 3, x: 330, width: 540 }]}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Email or username"
          name="identifier"
          autoComplete="username"
          placeholder="you@myumanitoba.ca"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          error={errors.identifier}
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
          <div className="mt-2 text-right">
            <a href="#" className="text-[13px] text-subtle transition-colors duration-300 hover:text-ink">
              Forgot password?
            </a>
          </div>
        </div>
        <button type="submit" className={`${primaryButton} w-full`}>
          Log in
          <Icon className="h-4 w-4">{icons.arrow}</Icon>
        </button>
        {notice && (
          <p role="status" className="rounded-xl bg-mist px-4 py-3 text-center text-sm text-subtle">
            {notice}
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
