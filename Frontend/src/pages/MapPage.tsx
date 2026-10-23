import { DashboardNavbar } from '../components/DashboardNavbar'
import { headingClass } from '../styles'

export default function MapPage() {
  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Rides on a <em className="text-subtle">map.</em>
        </h1>
        <p className="mt-3 text-lg text-subtle">Coming in Sprint 2.</p>
      </main>
    </div>
  )
}
