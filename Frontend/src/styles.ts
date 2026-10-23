// Zomato-style tile: flat at rest, lifts onto white with a soft shadow on hover.
export const hoverTile =
  'group block rounded-3xl border border-transparent p-3 transition-[transform,background-color,border-color,box-shadow] duration-500 ease-smooth hover:-translate-y-1 hover:border-black/5 hover:bg-white hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] sm:p-4'

// Bento tile: always visible, lifts on hover.
export const bentoTile =
  'group h-full overflow-hidden rounded-3xl bg-white p-7 transition-[transform,box-shadow] duration-500 ease-smooth hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] sm:p-8'

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[15px] font-medium text-white transition duration-300 ease-smooth hover:bg-black active:scale-[0.97]'
export const secondaryButton =
  'inline-flex items-center justify-center gap-1 rounded-full px-7 py-3.5 text-[15px] font-medium text-ink ring-1 ring-black/15 transition duration-300 ease-smooth hover:ring-black/40 active:scale-[0.97]'

export const headingClass = 'font-serif font-semibold tracking-[-0.02em] text-ink'

// Ring colours live in the two variants below: combining two ring colours on one element
// lets the generated CSS order decide which wins, not the class order.
const inputBase =
  'w-full rounded-xl bg-mist px-4 py-3.5 text-[15px] text-ink ring-1 transition duration-300 ease-smooth placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink'

export const inputClass = `${inputBase} ring-transparent hover:ring-black/10`
export const inputErrorClass = `${inputBase} ring-black/40`
