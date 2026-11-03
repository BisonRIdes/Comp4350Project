import { useId, useState, type InputHTMLAttributes } from 'react'
import { inputClass, inputErrorClass } from '../styles'
import { Icon } from './Icon'
import { icons } from './icons'

type TextFieldProps = {
  label: string
  hint?: string
  error?: string
  // Fixed text shown next to the input, like "@myumanitoba.ca", so the user only types the first part.
  suffix?: string
} & InputHTMLAttributes<HTMLInputElement>

// Labelled input with an optional hint or error. Password fields get a show/hide toggle.
export function TextField({ label, hint, error, suffix, type = 'text', ...inputProps }: TextFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const message = error ?? hint
  const messageId = `${id}-message`
  const suffixId = `${id}-suffix`
  // Screen readers announce the suffix too, so the user knows the domain is already filled in.
  const describedBy = [suffix && suffixId, message && messageId].filter(Boolean).join(' ') || undefined

  const field = (
    <div className={suffix ? 'relative min-w-0 flex-1' : 'relative'}>
      <input
        id={id}
        type={isPassword && revealed ? 'text' : type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${error ? inputErrorClass : inputClass} ${isPassword ? 'pr-12' : ''}`}
        {...inputProps}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-subtle transition-colors duration-300 hover:text-ink"
        >
          <Icon className="h-[18px] w-[18px]">{revealed ? icons.eyeOff : icons.eye}</Icon>
        </button>
      )}
    </div>
  )

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      {suffix ? (
        <div className="flex items-center gap-3">
          {field}
          <span id={suffixId} className="shrink-0 text-[15px] font-medium text-ink">
            {suffix}
          </span>
        </div>
      ) : (
        field
      )}
      {message && (
        <p id={messageId} className={`mt-2 text-[13px] ${error ? 'font-medium text-danger' : 'text-subtle'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
