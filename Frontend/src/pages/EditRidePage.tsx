import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AddressInput } from '../components/AddressInput'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { SeatStepper } from '../components/SeatStepper'
import { TextField } from '../components/TextField'
import { errorNotice, headingClass, primaryButton } from '../styles'
import { readError } from '../lib/api'
import { getUser } from '../lib/auth'
import { reverseGeocode } from '../lib/geocode'
import type { Place } from '../lib/places'
import { deleteRide, DESTINATION, fetchRide, toLocalInputValue, updateRide, type RideChanges, type RideOut } from '../lib/rides'

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
  // A new start picked from the suggestions; null means keep the ride's current start.
  const [place, setPlace] = useState<Place | null>(null)
  const [departure, setDeparture] = useState('')
  const [seats, setSeats] = useState(1)

  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  // Deleting takes two clicks so a driver can't remove a ride by accident.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    if (!from.trim()) {
      if (originalFrom) nextErrors.from = 'Enter where you are leaving from.'
    } else if (from.trim() !== originalFrom && !place) {
      nextErrors.from = 'Pick an address from the list so riders know exactly where to meet you.'
    }
    if (!departure) nextErrors.departure = 'Choose when you are leaving.'
    else if (new Date(departure) <= new Date()) nextErrors.departure = 'Pick a time in the future.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setNotice('')
    try {
      // PATCH only changes what we send, so leave out anything the driver didn't touch.
      const changes: RideChanges = {}
      if (place) {
        changes.origin_point = { type: 'Point', coordinates: place.coordinates }
        changes.origin_label = place.label
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

  async function handleDelete() {
    setDeleting(true)
    setNotice('')
    try {
      const response = await deleteRide(rideId)
      if (response.status === 409) {
        setNotice("You can't delete this ride because riders have already been accepted.")
        return
      }
      if (response.status === 403) {
        setNotice('You can only delete your own rides.')
        return
      }
      // 404 means it's already gone, so the dashboard is the right place either way.
      if (!response.ok && response.status !== 404) {
        setNotice(await readError(response))
        return
      }
      navigate('/dashboard')
    } catch {
      setNotice("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setDeleting(false)
      setConfirmingDelete(false)
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
              <AddressInput
                label="Leaving from"
                placeholder="Start typing an address, town or landmark"
                value={from}
                onChange={(text) => {
                  setFrom(text)
                  setPlace(null)
                  clearError('from')
                }}
                onSelect={(picked) => {
                  setFrom(picked.label)
                  setPlace(picked)
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

            {confirmingDelete ? (
              <div className="rounded-2xl bg-danger/5 p-4 text-center ring-1 ring-danger/20">
                <p className="text-sm font-medium text-danger">Delete this ride? This can't be undone.</p>
                <div className="mt-3 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink ring-1 ring-black/10 transition duration-300 hover:ring-black/30 disabled:opacity-60"
                  >
                    Keep ride
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-full bg-danger px-5 py-2.5 text-sm font-medium text-white transition duration-300 hover:opacity-90 disabled:opacity-60"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full rounded-full py-3 text-[15px] font-medium text-danger transition-colors duration-300 hover:bg-danger/5"
              >
                Delete ride
              </button>
            )}

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
