// Visibility state for the welcome-discount popup, persisted in localStorage so
// it survives reloads. One key holds a small JSON record: { type, at }.
//   - dismissed → hidden for DISMISS_HOURS, then eligible to show again
//   - done      → subscribed; hidden permanently
//   - ordered   → placed an order; hidden permanently
export const WELCOME_KEY = 'inkspirit_welcome_v1'
export const DISMISS_HOURS = 1

export function readWelcomeState() {
  try {
    return JSON.parse(localStorage.getItem(WELCOME_KEY))
  } catch {
    return null
  }
}

export function writeWelcomeState(state) {
  try {
    localStorage.setItem(WELCOME_KEY, JSON.stringify(state))
  } catch {
    /* private mode — non-fatal */
  }
}

// Called from the checkout success page — a placed order retires the popup for good.
export function markWelcomeOrdered() {
  writeWelcomeState({ type: 'ordered', at: Date.now() })
}

// Whether the popup should stay hidden right now.
export function isWelcomeSuppressed() {
  const s = readWelcomeState()
  if (!s || typeof s !== 'object') return false
  if (s.type === 'ordered' || s.type === 'done') return true // permanent
  if (s.type === 'dismissed') {
    return Date.now() - (s.at || 0) < DISMISS_HOURS * 60 * 60 * 1000
  }
  return false
}
