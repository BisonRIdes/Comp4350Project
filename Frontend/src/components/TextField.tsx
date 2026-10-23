import { useId, useState, type InputHTMLAttributes } from 'react'
import { inputClass, inputErrorClass } from '../styles'
import { Icon } from './Icon'
import { icons } from './icons'

type TextFieldProps = {
  label: string
  hint?: string
  error?: string
} & InputHTMLAttributes<HTMLInputElement>

// Labelled input with an optional hint or error. Password fields get a show/hide toggle.
export function TextField({ label, hint, error, type = 'text', ...inputProps }: TextFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const message = error ?? hint
  const messageId = `${id}-message`

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
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
      {message && (
        <p id={messageId} className={`mt-2 text-[13px] ${error ? 'font-medium text-ink' : 'text-subtle'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
