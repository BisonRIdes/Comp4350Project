import { useEffect, useState } from 'react'
import { getRoute, routeKey, type Route } from '../lib/routing'

type Stops = readonly (readonly number[])[]

// Driving routes for several lists of stops (GeoJSON [longitude, latitude], start → detours → end).
// Returns a lookup: the route for those stops, null when there's no road route, or undefined while
// it's loading or when the routing server couldn't be reached (show a straight line then).
export function useRoutes(stopLists: Stops[]) {
  const [found, setFound] = useState<Record<string, Route | null>>({})
  // The same stops in a new array shouldn't fetch again.
  const joined = [...new Set(stopLists.filter((stops) => stops.length > 1).map(routeKey))].join('|')

  useEffect(() => {
    if (!joined) return
    let active = true
    for (const key of joined.split('|')) {
      const stops = key.split(';').map((pair) => pair.split(',').map(Number))
      getRoute(stops)
        .then((route) => {
          if (active) setFound((previous) => ({ ...previous, [key]: route }))
        })
        .catch(() => undefined)
    }
    return () => {
      active = false
    }
  }, [joined])

  return (stops: Stops): Route | null | undefined => found[routeKey(stops)]
}

