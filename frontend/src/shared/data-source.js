/*
 * Where the app's data comes from. Set VITE_DATA_SOURCE in frontend/.env:
 *   fixture (default)  everything comes from fake-api.js and the community fixtures
 *   api                wired screens read the backend through shared/api.js
 *
 * In api mode a failed call does not break the screen: `load` warns in the console and
 * returns the fixture instead, so a demo survives a backend that is down.
 */
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'fixture'

/**
 * Read one piece of data. `fromApi` returns a promise; `fromFixture` returns the fixture value.
 * Resolves to { data, source }, where source says which of the two was used.
 */
export async function load(label, fromApi, fromFixture) {
  if (DATA_SOURCE !== 'api') return { data: fromFixture(), source: 'fixture' }
  try {
    return { data: await fromApi(), source: 'api' }
  } catch (error) {
    console.warn(`[WarmPath] ${label}: the backend call failed (${error.message}). Showing fixture data instead.`)
    return { data: fromFixture(), source: 'fixture' }
  }
}
