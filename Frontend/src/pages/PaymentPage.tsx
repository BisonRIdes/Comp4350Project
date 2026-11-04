import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import type { Stripe, StripeElements } from '@stripe/stripe-js'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import type { Ride } from '../components/RideCard'
import { useRides } from '../hooks/useRides'
import {
  appearance,
  fonts,
  formatPrice,
  getStripe,
  paymentsEnabled,
  readPayment,
  startPayment,
  type Payment,
} from '../lib/payments'
import { formatDeparture, routeLabel } from '../lib/rides'
import { headingClass, primaryButton } from '../styles'

type View =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'unpaid' | 'processing' | 'paid'; payment: Payment }

function RideSummary({ ride, amountCents }: { ride?: Ride; amountCents: number | null }) {
  return (
    <div className="mt-10 rounded-3xl bg-mist p-6">
      {ride && (
        <>
          <p className="text-[17px] font-semibold tracking-tight">{routeLabel(ride)}</p>
          <p className="mt-0.5 text-sm text-subtle">{formatDeparture(ride.departure)}</p>
        </>
      )}
      {amountCents !== null && (
        <div className={`flex items-baseline justify-between ${ride ? 'mt-5 border-t border-black/10 pt-5' : ''}`}>
          <span className="text-sm text-subtle">Your seat</span>
          <span className="text-lg font-semibold tabular-nums">{formatPrice(amountCents)} CAD</span>
        </div>
      )}
    </div>
  )
}

// Stripe's card form, styled to match our inputs, with our own Pay button.
function CardForm({ payment, onPaid }: { payment: Payment; onPaid: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [stripe, setStripe] = useState<Stripe | null>(null)
  const [elements, setElements] = useState<StripeElements | null>(null)
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let destroy = () => {}
    const failed = () => setError("Couldn't load the payment form. Check your connection and refresh the page.")
    getStripe()
      .then((loaded) => {
        if (!active || !container.current) return
        if (!loaded) throw new Error('Stripe.js did not load')
        const group = loaded.elements({ clientSecret: payment.client_secret ?? '', appearance, fonts })
        const element = group.create('payment')
        element.on('ready', () => setReady(true))
        // e.g. the payment was cancelled in the meantime, or the publishable key is wrong
        element.on('loaderror', failed)
        element.mount(container.current)
        destroy = () => element.destroy()
        setStripe(loaded)
        setElements(group)
      })
      .catch(failed)
    return () => {
      active = false
      destroy()
    }
  }, [payment.client_secret])

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    const { error: declined } = await stripe.confirmPayment({
      elements,
      // only used by payment methods that leave the page to check with the bank
      confirmParams: { return_url: `${window.location.origin}/requests/${payment.request_id}/pay` },
      redirect: 'if_required',
    })
    if (declined) {
      // Stripe's own message, e.g. "Your card has insufficient funds."
      setError(declined.message ?? "Your payment didn't go through. Try again.")
      setSubmitting(false)
      return
    }
    onPaid()
  }

  return (
    <form onSubmit={pay} className="mt-8 space-y-6">
      <div ref={container} className={ready || error ? '' : 'min-h-[180px] animate-pulse rounded-xl bg-mist'} />
      <button type="submit" disabled={!ready || submitting} className={`${primaryButton} w-full disabled:opacity-60`}>
        {submitting ? 'Paying…' : `Pay ${formatPrice(payment.amount_cents ?? 0)}`}
        <Icon className="h-4 w-4">{icons.arrow}</Icon>
      </button>
      {error && (
        <p role="alert" className="rounded-xl bg-mist px-4 py-3 text-center text-sm text-subtle">
          {error}
        </p>
      )}
      <p className="text-center text-[13px] text-subtle">
        Payments are handled by Stripe. Your card details never reach BisonRides.
      </p>
    </form>
  )
}

// Opened from "Pay" on the dashboard once the driver accepts: /requests/:requestId/pay
export default function PaymentPage() {
  const { requestId = '' } = useParams()
  const { rides } = useRides()
  const [view, setView] = useState<View>(
    paymentsEnabled ? { state: 'loading' } : { state: 'error', message: "Payments aren't set up yet." },
  )

  useEffect(() => {
    if (!paymentsEnabled) return
    let active = true
    startPayment(requestId)
      .then((payment) => active && setView({ state: payment.status, payment }))
      .catch((error: Error) => active && setView({ state: 'error', message: error.message }))
    return () => {
      active = false
    }
  }, [requestId])

  // Paid here; the seat counts as paid once Stripe tells our backend, usually within seconds.
  const confirming = view.state === 'processing'
  useEffect(() => {
    if (!confirming) return
    const timer = setInterval(async () => {
      try {
        const payment = await readPayment(requestId)
        if (payment.status === 'paid') setView({ state: 'paid', payment })
      } catch {
        // Try again on the next tick.
      }
    }, 2000)
    return () => clearInterval(timer)
  }, [confirming, requestId])

  const payment = 'payment' in view ? view.payment : undefined
  const ride = payment && rides.find((candidate) => candidate.id === payment.ride_id)

  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          {view.state === 'paid' ? (
            <>
              Seat <em className="text-subtle">confirmed.</em>
            </>
          ) : (
            <>
              Confirm your <em className="text-subtle">seat.</em>
            </>
          )}
        </h1>
        <p className="mt-3 text-lg text-subtle">
          {view.state === 'paid'
            ? 'You’re all set. We emailed a receipt to your student email.'
            : 'The driver accepted your request. Pay for your seat to lock it in.'}
        </p>

        {payment && <RideSummary ride={ride} amountCents={payment.amount_cents} />}

        {view.state === 'loading' && <div className="mt-10 h-48 animate-pulse rounded-3xl bg-mist" />}

        {view.state === 'unpaid' && (
          <CardForm payment={view.payment} onPaid={() => setView({ state: 'processing', payment: view.payment })} />
        )}

        {view.state === 'processing' && (
          <p role="status" className="mt-8 rounded-xl bg-mist px-4 py-3 text-center text-sm text-subtle">
            Confirming your payment with Stripe…
          </p>
        )}

        {view.state === 'paid' && (
          <p className="mt-8 flex items-center gap-3 text-[15px]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-white">
              <Icon className="h-4 w-4">{icons.check}</Icon>
            </span>
            Paid {formatPrice(view.payment.amount_cents ?? 0)}. If you cancel your seat, you get it all back.
          </p>
        )}

        {view.state === 'error' && (
          <p role="alert" className="mt-10 rounded-xl bg-mist px-4 py-3 text-center text-sm text-subtle">
            {view.message}
          </p>
        )}

        {(view.state === 'paid' || view.state === 'error') && (
          <Link to="/dashboard" className={`${primaryButton} mt-6 w-full`}>
            Back to rides
            <Icon className="h-4 w-4">{icons.arrow}</Icon>
          </Link>
        )}
      </main>
    </div>
  )
}
