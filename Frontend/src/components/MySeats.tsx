import type { Payment } from '../lib/payments'
import type { RideRequestDetails } from '../lib/rideRequests'
import { MyRequestCard } from './MyRequestCard'

// The rider's upcoming seats: pending ones can be cancelled, accepted ones paid for or left.
export function MySeats({
  seats,
  payments,
  onCancel,
}: {
  seats: RideRequestDetails[]
  payments: Payment[]
  onCancel: (requestId: string) => Promise<string>
}) {
  return (
    <ul className="mt-6 space-y-3">
      {seats.map((seat) => (
        <li key={seat.id}>
          <MyRequestCard
            request={seat}
            payment={payments.find((payment) => payment.request_id === seat.id)}
            onCancel={() => onCancel(seat.id)}
          />
        </li>
      ))}
    </ul>
  )
}
