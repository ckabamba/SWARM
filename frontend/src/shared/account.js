import { useSyncExternalStore } from 'react'
import api from './api.js'
import { DATA_SOURCE } from './data-source.js'

/*
 * The signed-in account, shared by every page.
 *
 * status
 *   'demo'     explicit fixture mode only; backend failures never switch identity to a demo student
 *   'loading'  api mode, before the first answer from GET /api/me
 *   'out'      api mode, nobody signed in
 *   'in'       api mode, signed in; `me` is { person_id, email, version, courses_version, profile }
 *
 * `open` says whether the account drawer (AccountPanel) is showing.
 */
let state = { status: DATA_SOURCE === 'api' ? 'loading' : 'demo', me: null, open: false }
const listeners = new Set()

function set(next) {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn())
}

export function useAccount() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn) }, () => state)
}

let started = false
/* Ask the backend who is signed in. Runs once, and only in api mode. */
export function loadAccount() {
  if (started || DATA_SOURCE !== 'api') return
  started = true
  api.me().then(
    (me) => set({ status: 'in', me }),
    (error) => {
      if (error.status === 401) return set({ status: 'out' })
      set({ status: 'error', me: null, error: error.message })
    },
  )
}

export async function refreshAccount() {
  try { const me = await api.me(); set({ status: 'in', me, error: '' }); return me }
  catch (error) { set({ status: error.status === 401 ? 'out' : 'error', me: null, error: error.message }); throw error }
}

export const openAccount = () => set({ open: true })
export const closeAccount = () => set({ open: false })

/* Each of these rejects with the backend's message, for the form to show. */
export async function signIn(credentials) {
  set({ status: 'in', me: await api.login(credentials) })
}
export async function register(details) {
  set({ status: 'in', me: await api.register(details) })
}
export async function signOut() {
  await api.logout()
  set({ status: 'out', me: null })
}
export async function saveProfile(profile, version = state.me.version) {
  const me = await api.saveProfile({ version, profile })
  set({ me })
  return me
}
/* Add the chosen resume suggestions to the profile. Resolves to how many were already there and skipped. */
export async function importResume(draftId, selections) {
  const { duplicates_skipped: skipped, ...me } = await api.importResume(draftId, {
    version: state.me.version, courses_version: state.me.courses_version, selections,
  })
  // Courses live on their own version; read the profile again so both numbers are current.
  set({ me: await api.me().catch(() => me) })
  return skipped
}
