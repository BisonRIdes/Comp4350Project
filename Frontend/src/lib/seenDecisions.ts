import { SEEN_DECISIONS_KEY } from '../constants'

// Remembered per user, so two accounts on one browser never share what they've read.
const keyFor = (userId: string) => `${SEEN_DECISIONS_KEY}:${userId}`

// Ids of requests whose accept or decline this user has already seen, or null if nothing was saved yet.
export function readSeenDecisions(userId: string): string[] | null {
  try {
    const saved = localStorage.getItem(keyFor(userId))
    return saved === null ? null : (JSON.parse(saved) as string[])
  } catch {
    // Storage blocked or the saved value is broken: treat it as never saved.
    return null
  }
}

export function writeSeenDecisions(userId: string, ids: string[]) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(ids))
  } catch {
    // Storage unavailable (e.g. a private window); the badge just can't remember what was read.
  }
}
