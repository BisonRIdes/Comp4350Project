import { divIcon, type LatLngTuple } from 'leaflet'

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
