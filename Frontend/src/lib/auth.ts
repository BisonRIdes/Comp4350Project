export type CurrentUser = { id: string; username: string; is_driver: boolean }

const KEY = 'currentUser'

export function saveUser(user: CurrentUser) {
  localStorage.setItem(KEY, JSON.stringify(user))
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