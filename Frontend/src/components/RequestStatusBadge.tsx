import { RequestStatus } from '../constants'

const badges: Record<RequestStatus, { label: string; className: string }> = {
  [RequestStatus.Pending]: { label: 'Pending', className: 'bg-mist text-ink' },
  [RequestStatus.Accepted]: { label: 'Accepted', className: 'bg-ink text-white' },
  [RequestStatus.Declined]: { label: 'Declined', className: 'bg-danger/10 text-danger' },
}

// Pill showing where a ride request stands.
export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = badges[status]
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>
}
