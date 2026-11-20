const minSeats = 1
const maxSeats = 8 // big enough for a minivan; raise it if needed

// − 3 + counter. The number can also be typed.
export function SeatStepper({ value, onChange }: { value: number; onChange: (seats: number) => void }) {
  const clamp = (seats: number) => Math.min(maxSeats, Math.max(minSeats, seats))
  const stepButton =
    'flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-ink ring-1 ring-black/10 transition duration-300 ease-smooth hover:ring-black/30 active:scale-[0.95] disabled:opacity-40 disabled:hover:ring-black/10'

  return (
    <div className="flex items-center justify-between rounded-2xl bg-mist p-2">
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= minSeats} aria-label="Remove a seat" className={stepButton}>
        −
      </button>
      <div className="text-center">
        <input
          type="number"
          inputMode="numeric"
          min={minSeats}
          max={maxSeats}
          value={value}
          onChange={(event) => {
            const typed = parseInt(event.target.value, 10)
            if (!Number.isNaN(typed)) onChange(clamp(typed))
          }}
          aria-label="Seats available"
          className="w-16 bg-transparent text-center text-2xl font-semibold tabular-nums text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <p className="text-xs text-subtle">{value === 1 ? 'seat' : 'seats'} for riders</p>
      </div>
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= maxSeats} aria-label="Add a seat" className={stepButton}>
        +
      </button>
    </div>
  )
}