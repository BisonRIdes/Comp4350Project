import { lazy, Suspense, type ComponentProps } from 'react'

// Leaflet is big, so it's only downloaded the first time a map is shown, not with every page.
const RideMap = lazy(() => import('./RideMap').then((module) => ({ default: module.RideMap })))

// Same props as RideMap. Shows the grey map box until the map code has loaded.
export function LazyRideMap(props: ComponentProps<typeof RideMap>) {
  return (
    <Suspense fallback={<div className="h-full w-full animate-pulse bg-mist" />}>
      <RideMap {...props} />
    </Suspense>
  )
}
