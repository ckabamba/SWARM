import { useSyncExternalStore } from 'react'

/* App-wide colour theme. Dark is the default look from DESIGN.md; light is the gold, navy and white variant. */
const KEY = 'warmpath.theme'
const listeners = new Set()

function stored() {
  try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

let theme = stored()
document.documentElement.dataset.theme = theme

function apply(next) {
  theme = next
  document.documentElement.dataset.theme = next
  listeners.forEach((fn) => fn())
}

export function setTheme(next) {
  if (next === theme) return
  try { localStorage.setItem(KEY, next) } catch { /* private mode: the choice lasts for this tab */ }
  apply(next)
}

// Follow a change made in another tab.
window.addEventListener('storage', (e) => { if (e.key === KEY && stored() !== theme) apply(stored()) })

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useTheme() {
  return useSyncExternalStore(subscribe, () => theme)
}
