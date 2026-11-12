import { Link } from 'react-router'
import { formatPrice, type Payment } from '../lib/payments'
import { Icon } from './Icon'
import { icons } from './icons'

// Pay, Paid, or "No payment needed" for one accepted seat. Both links open the payment page.
export function SeatPayment({ payment }: { payment: Payment }) {
  if (payment.status === 'paid') {
    return (
      <Link
        to={`/requests/${payment.request_id}/pay`}
        className="inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-medium text-ink"
      >
        <Icon className="h-4 w-4">{icons.check}</Icon>
        Paid {formatPrice(payment.amount_cents ?? 0)}
      </Link>
    )
  }
  if (payment.amount_cents !== null) {
    return (
      <Link
        to={`/requests/${payment.request_id}/pay`}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition duration-300 hover:bg-black"
      >
        Pay {formatPrice(payment.amount_cents)}
        <Icon className="h-4 w-4">{icons.arrow}</Icon>
      </Link>
    )
  }
  return <span className="text-sm text-subtle">No payment needed</span>
}
