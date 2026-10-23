// Requests go to /api, which the Vite dev server forwards to the backend with the API key attached
// (see vite.config.ts). The key is never sent from the browser, so it can't leak into the bundle.
const API_URL = '/api'

// Like fetch, but always calls the backend and sends JSON bodies.
export function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API_URL}${path}`, { ...init, headers })
}

// FastAPI errors come back as { detail: "text" } or, for validation (422), a list of problems.
export async function readError(response: Response) {
  try {
    const { detail } = await response.json()
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return `${detail[0].loc?.slice(1).join('.')}: ${detail[0].msg}`
  } catch {
    // No JSON body.
  }
  return `Something went wrong (${response.status}). Please try again.`
}
