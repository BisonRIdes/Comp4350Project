const API_URL = '/api'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

// Like fetch, but always calls the backend with the API key attached.
export function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('x-key', API_KEY)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API_URL}${path}`, { ...init, headers })
}