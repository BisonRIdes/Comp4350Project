// The signed-in user and their login token (from POST /auth/login). Kept in localStorage until sign out.
export type CurrentUser = { id: string; username: string; email: string; is_driver: boolean }

const KEY = 'currentUser'
const TOKEN_KEY = 'token'

export function saveSession(token: string, { id, username, email, is_driver }: CurrentUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(KEY, JSON.stringify({ id, username, email, is_driver }))
}

export function saveUser({ id, username, email, is_driver }: CurrentUser) {
  localStorage.setItem(KEY, JSON.stringify({ id, username, email, is_driver }))
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// Without a token the backend rejects every request, so a saved user alone (e.g. from before
// logging in existed) doesn't count as signed in.
export function getUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw && getToken() ? (JSON.parse(raw) as CurrentUser) : null
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(KEY)
}
