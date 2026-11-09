import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { SeatStepper } from '../components/SeatStepper'
import { TextField } from '../components/TextField'
import { errorNotice, headingClass, primaryButton } from '../styles'
import { readError } from '../lib/api'
import { getUser } from '../lib/auth'
import { geocode, reverseGeocode } from '../lib/geocode'
import { DESTINATION, fetchRide, toLocalInputValue, updateRide, type RideChanges, type RideOut } from '../lib/rides'

type Errors = { from?: string; departure?: string }

export default function EditRidePage() {
  const { rideId = '' } = useParams()
  const navigate = useNavigate()
  // Only the id is needed, to check the ride is this driver's.
  const userId = getUser()?.id
  const [earliestDeparture] = useState(() => toLocalInputValue(new Date()))

  // The ride as loaded, so we only send the fields the driver changed.
  const [original, setOriginal] = useState<RideOut | null>(null)
  const [originalFrom, setOriginalFrom] = useState('')
  const [from, setFrom] = useState('')
  const [departure, setDeparture] = useState('')
  const [seats, setSeats] = useState(1)

  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const clearError = (field: keyof Errors) => setErrors((current) => ({ ...current, [field]: undefined }))

  useEffect(() => {
    async function load() {
      try {
        const response = await fetchRide(rideId)
        if (response.status === 404) {
          setLoadError("This ride doesn't exist anymore.")
          return
        }
        if (!response.ok) {
          setLoadError(await readError(response))
          return
        }
        const ride: RideOut = await response.json()
        if (String(ride.driver_id) !== userId) {
          setLoadError('You can only edit your own rides.')
          return
        }
        setOriginal(ride)
        setDeparture(toLocalInputValue(new Date(ride.departure_time)))
        setSeats(ride.seats)


        // The backend only stores coordinates, so turn them back into a place name to prefill.
        // If the lookup fails the box stays empty, which still lets the driver save other changes.
        if (ride.origin_point) {
          const name = (await reverseGeocode(ride.origin_point.coordinates).catch(() => null)) ?? ''
          setFrom(name)
          setOriginalFrom(name)
        }
      } catch {
        setLoadError("Couldn't load this ride. Check that the server is running and try again.")
      }
    }
    load()
  }, [rideId, userId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!original) return

    const nextErrors: Errors = {}
    // If the place name couldn't be looked up, an empty box just means "keep the same start".
    if (!from.trim() && originalFrom) nextErrors.from = 'Enter where you are leaving from.'
    if (!departure) nextErrors.departure = 'Choose when you are leaving.'
    else if (new Date(departure) <= new Date()) nextErrors.departure = 'Pick a time in the future.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setNotice('')
    try {
      // PATCH only changes what we send, so leave out anything the driver didn't touch.
      const changes: RideChanges = {}
      if (from.trim() && from.trim() !== originalFrom) {
        const coordinates = await geocode(from.trim())
        if (!coordinates) {
          setErrors({ from: 'We couldn\'t find that place in Manitoba. Try adding the town, e.g. "Main St, Steinbach".' })
          return
        }
        changes.origin_point = { type: 'Point', coordinates }
      }
      const newDeparture = new Date(departure).toISOString()
      if (newDeparture !== new Date(original.departure_time).toISOString()) changes.departure_time = newDeparture
      if (seats !== original.seats) changes.seats = seats

      if (Object.keys(changes).length === 0) {
        setNotice('Nothing changed yet.')
        return
      }

      const response = await updateRide(rideId, changes)
      if (response.status === 403) {
        setNotice('You can only edit your own rides.')
        return
      }
      if (response.status === 404) {
        setNotice("This ride doesn't exist anymore.")
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
          Edit your <em className="text-subtle">ride.</em>
        </h1>
        <p className="mt-3 text-lg text-subtle">Change where or when you're leaving, or how many seats you have.</p>

        {loadError ? (
          <div role="alert" className="mt-10 rounded-3xl bg-mist px-6 py-12 text-center">
            <p className="text-lg font-medium">{loadError}</p>
            <Link to="/dashboard" className={`${primaryButton} mt-6`}>
              Back to rides
              <Icon className="h-4 w-4">{icons.arrow}</Icon>
            </Link>
          </div>
        ) : !original ? (
          <div aria-label="Loading ride" className="mt-10 h-96 animate-pulse rounded-3xl bg-mist" />
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

            <button type="submit" disabled={submitting} className={`${primaryButton} w-full disabled:opacity-60`}>
              {submitting ? 'Saving…' : 'Save changes'}
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
