// The signed-in user, as returned by POST /users (UserResponse). Kept in localStorage until sign out.
export type CurrentUser = { id: string; username: string; email: string; is_driver: boolean }

const KEY = 'currentUser'

export function saveUser({ id, username, email, is_driver }: CurrentUser) {
  localStorage.setItem(KEY, JSON.stringify({ id, username, email, is_driver }))
}

export function getUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CurrentUser) : null
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(KEY)
}
