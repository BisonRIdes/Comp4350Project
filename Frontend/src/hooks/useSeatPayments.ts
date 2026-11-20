import { useEffect, useState } from 'react'
import { readPayment, type Payment } from '../lib/payments'

// The payment for each accepted seat, e.g. to show Pay or Paid. Seats whose payment can't be read are
// left out, so the rider just doesn't see a Pay button for them instead of an error.
export function useSeatPayments(requestIds: string[]) {
  // A new array with the same seats shouldn't load the payments again.
  const key = requestIds.join(',')
  const [loaded, setLoaded] = useState<{ key: string; payments: Payment[] } | null>(null)

  useEffect(() => {
    if (!key) return
    let active = true
    Promise.all(key.split(',').map((requestId) => readPayment(requestId).catch(() => null))).then((found) => {
      if (active) setLoaded({ key, payments: found.filter((payment) => payment !== null) })
    })
    return () => {
      active = false
    }
  }, [key])

  return loaded && loaded.key === key ? loaded.payments : []
}
