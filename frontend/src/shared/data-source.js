/*
 * Where the app's data comes from. Set VITE_DATA_SOURCE in frontend/.env:
 *   fixture (default)  everything comes from fake-api.js and the community fixtures
 *   api                wired screens read the backend through shared/api.js
 *
 * In api mode a failed call never falls back to fixtures: invented people, posts or events
 * must not appear on a page that says its data is real. `load` warns in the console and
 * returns an empty list marked 'unavailable', and the screen says the data could not be loaded.
 */
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'fixture'

/**
 * Read one list. `fromApi` returns a promise; `fromFixture` returns the fixture value.
 * Resolves to { data, source }: 'fixture' in fixture mode, 'api' on success, or
 * 'unavailable' with an empty list when the backend call fails.
 */
export async function load(label, fromApi, fromFixture) {
  if (DATA_SOURCE !== 'api') return { data: fromFixture(), source: 'fixture' }
  try {
    return { data: await fromApi(), source: 'api' }
  } catch (error) {
    console.warn(`[WarmPath] ${label}: the backend call failed (${error.message}). Nothing is shown in its place.`)
    return { data: [], source: 'unavailable' }
  }
}
