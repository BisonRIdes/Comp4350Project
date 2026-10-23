import { TextField } from './TextField'

type LocationFieldsProps = {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  fromError?: string
  toError?: string
}

// Two plain text fields for where the ride starts and ends.
export function LocationFields({ from, to, onFromChange, onToChange, fromError, toError }: LocationFieldsProps) {
  return (
    <div className="space-y-5">
      <TextField
        label="Leaving from"
        name="from"
        placeholder="e.g. St. Vital Centre"
        value={from}
        onChange={(event) => onFromChange(event.target.value)}
        error={fromError}
      />
      <TextField
        label="Going to"
        name="to"
        placeholder="e.g. University of Manitoba"
        value={to}
        onChange={(event) => onToChange(event.target.value)}
        error={toError}
      />
    </div>
  )
}
