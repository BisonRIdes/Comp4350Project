import { useNavigate } from 'react-router'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { getUser, logout } from '../lib/auth'
import { headingClass, secondaryButton } from '../styles'

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = getUser()

  function signOut() {
    logout()
    navigate('/login')
  }

  const details = [
    { label: 'Username', value: user?.username },
    { label: 'Email', value: user?.email },
    { label: 'Account type', value: user?.is_driver ? 'Driver (can also find rides)' : 'Rider' },
  ]

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Your <em className="text-subtle">profile.</em>
        </h1>
        <p className="mt-3 text-lg text-subtle">Editing your details is coming in Sprint 2.</p>

        <dl className="mt-10 divide-y divide-black/5 rounded-3xl bg-mist px-6">
          {details.map((detail) => (
            <div key={detail.label} className="flex flex-col gap-1 py-5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-subtle">{detail.label}</dt>
              <dd className="font-medium">{detail.value ?? '—'}</dd>
            </div>
          ))}
        </dl>

        <button type="button" onClick={signOut} className={`${secondaryButton} mt-8`}>
          Sign out
        </button>
      </main>
    </div>
  )
}
