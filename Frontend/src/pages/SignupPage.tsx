import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '../components/AuthLayout'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { TextField } from '../components/TextField'
import { primaryButton } from '../styles'

type Role = 'rider' | 'driver'
type Errors = { username?: string; email?: string; password?: string }

const roles: { value: Role; title: string; text: string; icon: ReactNode }[] = [
  { value: 'rider', title: 'I need rides', text: 'Find drivers heading to campus.', icon: icons.hand },
  { value: 'driver', title: 'I drive', text: 'Offer seats and split gas costs.', icon: icons.car },
]

const minPasswordLength = 8

export default function SignupPage() {
  const [role, setRole] = useState<Role>('rider')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Errors = {}
    if (!username.trim()) nextErrors.username = 'Choose a username.'
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Enter a valid email address.'
    if (password.length < minPasswordLength) nextErrors.password = `Use at least ${minPasswordLength} characters.`
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // TODO: call POST /users with { username, email, password, is_driver: role === 'driver' }
    // once the backend endpoint is implemented.
    setNotice("Sign up isn't connected to the server yet.")
  }

  return (
    <AuthLayout
      title={
        <>
          Join the <em className="text-subtle">ride.</em>
        </>
      }
      subtitle="Create your BisonRides account. It only takes a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
      panelTitle={
        <>
          Fewer cars. <em className="text-subtle">More company.</em>
        </>
      }
      panelText="Share the commute with other University of Manitoba students and split the cost of every trip."
      panelCars={[
        { tone: 'black', passengers: 2, x: 275, width: 300 },
        { tone: 'silver', passengers: 3, x: 615, width: 300 },
      ]}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-ink">How will you use BisonRides?</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((option) => {
              const selected = role === option.value
              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-2xl p-4 ring-1 transition duration-300 ease-smooth has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
                    selected
                      ? 'bg-ink text-white ring-ink'
                      : 'bg-white text-ink ring-black/10 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.2)] hover:ring-black/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => setRole(option.value)}
                    className="sr-only"
                  />
                  <Icon className={`h-5 w-5 ${selected ? 'text-white' : 'text-subtle'}`}>{option.icon}</Icon>
                  <span className="mt-3 block text-[15px] font-semibold">{option.title}</span>
                  <span className={`mt-0.5 block text-[13px] leading-snug ${selected ? 'text-neutral-400' : 'text-subtle'}`}>
                    {option.text}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          placeholder="bison_rider"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          error={errors.username}
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@myumanitoba.ca"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`At least ${minPasswordLength} characters.`}
          error={errors.password}
        />

        <button type="submit" className={`${primaryButton} w-full`}>
          Create account
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
