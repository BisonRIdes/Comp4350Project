import type { Appearance, CssFontSource, Stripe } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js/pure'
import { apiFetch, readError } from './api'

// What POST and GET /requests/{id}/payment return (PaymentOut).
export type Payment = {
  request_id: string
  ride_id: string
  amount_cents: number | null // null when the ride has no price
  // "processing": paid here, waiting for Stripe to confirm it to our backend
  status: 'unpaid' | 'processing' | 'paid'
  client_secret: string | null // only while unpaid, for Stripe's card form
}

export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

// Unlike API_KEY, the publishable key is meant to be public: it can start a payment but never move
// money, so it's fine in the browser bundle. Empty when payments aren't set up.
const publishableKey: string = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
export const paymentsEnabled = publishableKey !== ''

// Stripe.js has to come from js.stripe.com. The "pure" import waits until a payment page asks for it,
// instead of loading it on every page.
let stripe: Promise<Stripe | null> | undefined
export function getStripe() {
  stripe ??= loadStripe(publishableKey)
  return stripe
}

// The card form sits in Stripe's iframe, where our CSS can't reach, so this restyles it to match
// TextField and the colours in index.css.
export const appearance: Appearance = {
  theme: 'flat',
  variables: {
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    fontSizeBase: '15px',
    colorPrimary: '#1d1d1f', // ink
    colorText: '#1d1d1f',
    colorTextSecondary: '#6e6e73', // subtle
    colorBackground: '#ffffff',
    borderRadius: '12px', // rounded-xl
  },
  rules: {
    '.Input': { backgroundColor: '#f5f5f7', border: 'none', boxShadow: 'none', padding: '14px 16px' }, // mist
    '.Input:focus': { backgroundColor: '#ffffff', boxShadow: '0 0 0 2px #1d1d1f' },
    '.Label': { fontSize: '14px', fontWeight: '500', marginBottom: '8px' },
  },
}

// The iframe can't use the page's fonts either, so it loads DM Sans itself (same URL as index.html).
export const fonts: CssFontSource[] = [
  { cssSrc: 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap' },
]

async function paymentFrom(response: Response): Promise<Payment> {
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

// Start (or pick up) paying for an accepted seat. The backend sets the amount from the ride.
export async function startPayment(requestId: string) {
  return paymentFrom(await apiFetch(`/requests/${requestId}/payment`, { method: 'POST' }))
}

export async function readPayment(requestId: string) {
  return paymentFrom(await apiFetch(`/requests/${requestId}/payment`))
}
