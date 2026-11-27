import { divIcon, type DivIcon, type LatLngTuple } from 'leaflet'

// Shared by the ride map and the location picker. Only import this from lazily loaded map code,
// or Leaflet ends up in the main bundle.

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// The API uses GeoJSON [longitude, latitude]; Leaflet wants [latitude, longitude].
export const toLatLng = ([lng, lat]: readonly number[]): LatLngTuple => [lat, lng]

// Plain dots drawn with CSS. Leaflet's default pin images don't load after Vite bundles them.
export function dot(className: string, size = 16) {
  return divIcon({ className: '', html: `<span class="block h-full w-full rounded-full ring-4 ${className}"></span>`, iconSize: [size, size] })
}

// A dot in a ride's colour (see rideColor.ts): filled for where the ride starts, hollow (white with
// a coloured ring) for a rider's pickup. Icons are reused, so re-rendering doesn't make new ones.
const colorDots = new Map<string, DivIcon>()
export function colorDot(color: string, size = 16, hollow = false) {
  const key = `${color}|${size}|${hollow}`
  let icon = colorDots.get(key)
  if (!icon) {
    const style = hollow
      ? `background:#fff;box-shadow:0 0 0 3px ${color},0 2px 6px rgba(0,0,0,.3)`
      : `background:${color};box-shadow:0 0 0 4px #fff,0 2px 8px rgba(0,0,0,.35)`
    icon = divIcon({ className: '', html: `<span class="block h-full w-full rounded-full" style="${style}"></span>`, iconSize: [size, size] })
    colorDots.set(key, icon)
  }
  return icon
}

// Standout marker for a pending rider's requested pickup while previewing a request.
export function previewDot(color: string, size = 20) {
  const key = `preview|${color}|${size}`
  let icon = colorDots.get(key)
  if (!icon) {
    const style = `background:#f59e0b;box-shadow:0 0 0 3px #fff,0 0 0 5.5px ${color},0 3px 10px rgba(0,0,0,.35)`
    icon = divIcon({ className: '', html: `<span class="block h-full w-full rounded-full" style="${style}"></span>`, iconSize: [size, size] })
    colorDots.set(key, icon)
  }
  return icon
}
