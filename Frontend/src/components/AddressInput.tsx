import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { inputClass, inputErrorClass } from '../styles'
import { searchPlaces, type Place } from '../lib/places'

type Status = 'idle' | 'loading' | 'done' | 'error'

type AddressInputProps = {
  label: string
  placeholder?: string
  value: string
  onChange: (text: string) => void // the user typed; any place picked before no longer applies
  onSelect: (place: Place) => void // the user picked a suggestion
  error?: string
  // "field" looks like TextField (Post Ride); "search" is a segment of the dashboard search bar.
  variant?: 'field' | 'search'
}

const minLength = 3
const debounceMs = 300

// Text input that suggests full addresses in Manitoba as you type (an ARIA combobox).
// Up/Down to move, Enter to pick, Escape to close.
export function AddressInput({ label, placeholder, value, onChange, onSelect, error, variant = 'field' }: AddressInputProps) {
  const id = useId()
  const listId = `${id}-list`
  const messageId = `${id}-message`
  // Only text the user typed is searched, so picking a suggestion doesn't search again.
  // A new object per keystroke, so retyping the same text still runs the search (from cache).
  const [query, setQuery] = useState({ text: '' })
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    if (query.text.trim().length < minLength) return
    const controller = new AbortController()
    // Wait until typing pauses, and cancel the search if more is typed (Photon's fair-use rules).
    const timer = setTimeout(async () => {
      try {
        setResults(await searchPlaces(query.text, controller.signal))
        setStatus('done')
      } catch {
        if (!controller.signal.aborted) setStatus('error')
      }
    }, debounceMs)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function handleChange(text: string) {
    onChange(text)
    setQuery({ text })
    setActive(-1)
    const longEnough = text.trim().length >= minLength
    setOpen(longEnough)
    setStatus(longEnough ? 'loading' : 'idle')
    if (!longEnough) setResults([])
  }

  function pick(place: Place) {
    onSelect(place)
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = status === 'done' ? results.length : 0
    if (event.key === 'ArrowDown' && count > 0) {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index + 1) % count)
    } else if (event.key === 'ArrowUp' && count > 0) {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index <= 0 ? count - 1 : index - 1))
    } else if (event.key === 'Enter' && open && active >= 0 && count > 0) {
      event.preventDefault() // pick the suggestion instead of submitting the form
      pick(results[active])
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    }
  }

  const isSearch = variant === 'search'
  const showList = open && status !== 'idle'

  const input = (
    <input
      id={id}
      type="text"
      role="combobox"
      autoComplete="off"
      aria-autocomplete="list"
      aria-expanded={showList}
      aria-controls={listId}
      aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? messageId : undefined}
      placeholder={placeholder}
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      onKeyDown={handleKeyDown}
      // Coming back to text you typed (not a picked address) reopens its suggestions.
      onFocus={() => results.length > 0 && query.text === value && setOpen(true)}
      onBlur={() => setOpen(false)}
      className={
        isSearch
          ? 'mt-0.5 w-full bg-transparent text-[15px] text-ink placeholder:text-neutral-400 focus:outline-none'
          : error
            ? inputErrorClass
            : inputClass
      }
    />
  )

  return (
    <div className="relative">
      {isSearch ? (
        <label htmlFor={id} className="block cursor-text px-5 py-3 transition-colors duration-300 hover:bg-mist md:rounded-full">
          <span className="block text-xs font-medium text-ink">{label}</span>
          {input}
        </label>
      ) : (
        <>
          <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
            {label}
          </label>
          {input}
        </>
      )}

      {showList && (
        <div
          className={`absolute inset-x-0 z-20 mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)] ring-1 ring-black/10 ${isSearch ? 'md:min-w-88' : ''}`}
        >
          {status === 'loading' && <p className="px-4 py-3 text-sm text-subtle">Searching…</p>}
          {status === 'error' && <p className="px-4 py-3 text-sm text-subtle">Couldn't load suggestions. Check your connection.</p>}
          {status === 'done' && results.length === 0 && <p className="px-4 py-3 text-sm text-subtle">No matches in Manitoba.</p>}
          <ul id={listId} role="listbox" aria-label={`${label} suggestions`}>
            {status === 'done' &&
              results.map((place, index) => (
                <li
                  key={place.label}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // mousedown, not click: the input's blur would close the list before a click lands.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    pick(place)
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={`cursor-pointer px-4 py-2.5 ${index === active ? 'bg-mist' : ''}`}
                >
                  <p className="truncate text-[15px] font-medium text-ink">{place.name}</p>
                  {place.detail && <p className="truncate text-[13px] text-subtle">{place.detail}</p>}
                </li>
              ))}
          </ul>
          <p className="border-t border-black/5 px-4 py-1.5 text-[11px] text-neutral-400">
            Search by Photon · © OpenStreetMap contributors
          </p>
        </div>
      )}

      {error && !isSearch && (
        <p id={messageId} className="mt-2 text-[13px] font-medium text-ink">
          {error}
        </p>
      )}
    </div>
  )
}
