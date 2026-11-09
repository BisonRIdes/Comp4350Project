import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { TextField } from '../components/TextField'
import { errorNotice, headingClass, primaryButton } from '../styles'
import { apiFetch, readError } from '../lib/api'
import { getUser } from '../lib/auth'
import { geocode } from '../lib/geocode'
import { DESTINATION, toLocalInputValue } from '../lib/rides'
import { SeatStepper } from '../components/SeatStepper'

type Errors = { from?: string; departure?: string; price?: string }



export default function PostRidePage() {
  const navigate = useNavigate()
  // The route requires a signed-in user (see RequireAuth), so this is only null if storage was cleared mid-visit.
  const user = getUser()
  // The datetime picker's earliest choice: now, when the page opened.
  const [earliestDeparture] = useState(() => toLocalInputValue(new Date()))
  const [from, setFrom] = useState('')
  const [departure, setDeparture] = useState('')
  const [seats, setSeats] = useState(3)
  const [price, setPrice] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const clearError = (field: keyof Errors) => setErrors((current) => ({ ...current, [field]: undefined }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Errors = {}
    if (!from.trim()) nextErrors.from = 'Enter where you are leaving from.'
    if (!departure) nextErrors.departure = 'Choose when you are leaving.'
    else if (new Date(departure) <= new Date()) nextErrors.departure = 'Pick a time in the future.'
    const priceValue = Number(price)
    if (!price || Number.isNaN(priceValue) || priceValue <= 0) nextErrors.price = 'Enter a price per seat.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (!user) {
      navigate('/login')
      return
    }

    setSubmitting(true)
    setNotice('')
    try {
      // Turn the typed starting point into coordinates for origin_point.
      const coordinates = await geocode(from.trim())
      if (!coordinates) {
        setErrors({ from: 'We couldn\'t find that place in Manitoba. Try adding the town, e.g. "Main St, Steinbach".' })
        return
      }

      const response = await apiFetch('/rides', {
        method: 'POST',
        body: JSON.stringify({
          // Fields create_ride reads today. The driver is whoever is logged in (from the token).
          origin_point: { type: 'Point', coordinates }, // GeoJSON order: [longitude, latitude]
          departure_time: new Date(departure).toISOString(),
          seats,
          // Not saved by the backend yet; ignored until CreateRideBody has them:
          origin_label: from.trim(),
          destination_label: DESTINATION,
          price_cents: Math.round(priceValue * 100),
        }),
      })
      if (response.status === 403) {
        setNotice("Your account isn't set up as a driver, so you can't post rides yet.")
        return
      }
      if (!response.ok) {
        setNotice(await readError(response))
        return
      }
      navigate('/dashboard')
    } catch {
      setNotice("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Offer a <em className="text-subtle">ride.</em>
        </h1>
        <p className="mt-3 text-lg text-subtle">Share your trip and split the cost of gas.</p>

        {user && !user.is_driver ? (
          <div role="status" className="mt-10 rounded-3xl bg-mist px-6 py-12 text-center">
            <p className="text-lg font-medium">Posting rides is for drivers.</p>
            <p className="mx-auto mt-2 max-w-sm text-subtle">
              You signed up as a rider, so your account can't offer rides. You can still find a ride to campus.
            </p>
            <Link to="/dashboard" className={`${primaryButton} mt-6`}>
              Find a ride
              <Icon className="h-4 w-4">{icons.arrow}</Icon>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-8">
            <div className="space-y-4">
              <TextField
                label="Leaving from"
                name="from"
                placeholder="Address, town or landmark"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value)
                  clearError('from')
                }}
                error={errors.from}
              />
              <div>
                <span className="mb-2 block text-sm font-medium text-ink">Going to</span>
                <p className="rounded-2xl bg-mist px-4 py-3.5 text-[15px] text-subtle">{DESTINATION}</p>
              </div>
            </div>

            <TextField
              label="Departure time"
              type="datetime-local"
              name="departure"
              min={earliestDeparture}
              value={departure}
              onChange={(event) => {
                setDeparture(event.target.value)
                clearError('departure')
              }}
              error={errors.departure}
            />

            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-ink">Seats available</legend>
              <SeatStepper value={seats} onChange={setSeats} />
              <p className="mt-2 text-[13px] text-subtle">Count only the seats you're offering, not your own.</p>
            </fieldset>

            <div>
              <TextField
                label="Price per seat"
                type="number"
                name="price"
                inputMode="decimal"
                min="0.25"
                step="0.25"
                placeholder="5.00"
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value)
                  clearError('price')
                }}
                hint="What each rider pays you. Think of it as their share of gas."
                error={errors.price}
              />
              {Number(price) > 0 && !errors.price && (
                <p className="mt-2 text-[13px] text-subtle">
                  With all {seats} {seats === 1 ? 'seat' : 'seats'} filled you'd get{' '}
                  <span className="font-medium text-ink tabular-nums">${(Number(price) * seats).toFixed(2)}</span>.
                </p>
              )}
            </div>

            <button type="submit" disabled={submitting} className={`${primaryButton} w-full disabled:opacity-60`}>
              {submitting ? 'Posting…' : 'Post ride'}
              <Icon className="h-4 w-4">{icons.arrow}</Icon>
            </button>
            {notice && (
              <p role="alert" className={errorNotice}>
                {notice}
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  )
}