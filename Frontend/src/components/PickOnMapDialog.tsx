import { lazy, Suspense, useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { Icon } from './Icon'
import { icons } from './icons'
import { getCurrentPoint } from '../lib/location'
import { reversePlace, type Place } from '../lib/places'
import { primaryButton, secondaryButton } from '../styles'

// Leaflet is only downloaded the first time a map is shown.
const PickerMap = lazy(() => import('./PickerMap').then((module) => ({ default: module.PickerMap })))

type Status = 'idle' | 'loading' | 'found' | 'outside' | 'error'

// Wait for the pin to stop moving before looking up its address (Photon's fair-use rules).
const lookupDelayMs = 400

type PickOnMapDialogProps = {
  title: string // e.g. the field's label, "Leaving from"
  start?: readonly number[] | null // where the pin starts, GeoJSON [longitude, latitude]
  onPick: (place: Place) => void
  onClose: () => void // the dialog closed, picked or not; unmount it then
}

// Pop-up map for choosing a spot instead of typing it: click to drop a pin, drag it to adjust,
// or jump to the user's current location. Shows the pin's address and hands back a Place.
export function PickOnMapDialog({ title, start = null, onPick, onClose }: PickOnMapDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [point, setPoint] = useState<[number, number] | null>(start ? [start[0], start[1]] : null)
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [status, setStatus] = useState<Status>(start ? 'loading' : 'idle')
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Look up the address under the pin. State is only set once the answer arrives.
  useEffect(() => {
    if (!point) return
    let active = true
    const timer = setTimeout(() => {
      reversePlace(point).then(
        (found) => {
          if (!active) return
          setPlace(found)
          setStatus(found ? 'found' : 'outside')
        },
        () => {
          if (active) setStatus('error')
        },
      )
    }, lookupDelayMs)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [point])

  function movePin(next: [number, number]) {
    setPoint(next)
    setPlace(null)
    setStatus('loading')
    setNotice('')
  }

  async function locateMe() {
    setLocating(true)
    setNotice('')
    try {
      const here = await getCurrentPoint()
      movePin(here)
      setFlyTo(here)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't find your location.")
    } finally {
      setLocating(false)
    }
  }

  function confirm() {
    if (!place) return
    onPick(place)
    dialogRef.current?.close()
  }

  // A click on the dialog element itself (not its content) means the backdrop was clicked.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) dialogRef.current.close()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleClick}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-3xl bg-white p-0 text-ink shadow-[0_40px_120px_-30px_rgba(0,0,0,0.45)] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-subtle">Click the map to drop a pin, then drag it to the exact spot.</p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-subtle ring-1 ring-black/10 transition-colors duration-300 hover:text-ink"
          >
            <Icon className="h-4 w-4">{icons.close}</Icon>
          </button>
        </div>

        <div className="mt-4 h-[min(55svh,26rem)] overflow-hidden rounded-2xl bg-mist ring-1 ring-black/10">
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-mist" />}>
            <PickerMap point={point} flyTo={flyTo} onPick={movePin} />
          </Suspense>
        </div>

        <div role="status" aria-live="polite" className="mt-4 min-h-11 text-[15px]">
          {status === 'idle' && <p className="text-subtle">No spot picked yet.</p>}
          {status === 'loading' && <p className="text-subtle">Looking up the address…</p>}
          {status === 'found' && place && (
            <>
              <p className="font-medium">{place.name}</p>
              <p className="text-sm text-subtle">{place.detail}</p>
            </>
          )}
          {status === 'outside' && <p className="font-medium text-danger">That spot is outside Manitoba. Pick a place in Manitoba.</p>}
          {status === 'error' && <p className="font-medium text-danger">Couldn't look up this address. Check your connection, then move the pin to try again.</p>}
        </div>
        {notice && (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {notice}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={locateMe} disabled={locating} className={`${secondaryButton} disabled:opacity-60`}>
            <Icon className="h-4 w-4">{icons.locate}</Icon>
            {locating ? 'Finding you…' : 'Use my current location'}
          </button>
          <button type="button" onClick={confirm} disabled={!place} className={`${primaryButton} disabled:opacity-40`}>
            Use this location
          </button>
        </div>
      </div>
    </dialog>
  )
}
