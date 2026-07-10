// Tracks the design IDs this browser has created, so "My Designs" can show them
// without requiring accounts. Newest first, capped so it can't grow unbounded.
const STORAGE_KEY = 'inkspirit_designs'
const MAX = 100

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function write(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX)))
  } catch {
    // storage unavailable / full — sharing still works via the returned link
  }
}

export function recordDesign(id) {
  if (!id || typeof id !== 'string') return
  const ids = read().filter((existing) => existing !== id)
  ids.unshift(id)
  write(ids)
}

export function getDesignIds() {
  return read()
}

export function useDesigns() {
  return { recordDesign, getDesignIds }
}
