/*
 * HTTP client for the WarmPath backend (backend/api/). A port of prototypes/thermal/api.js
 * to an ES module, with the same timeout and error handling.
 *
 * Requests go to /api on the page's own origin. In development the Vite proxy in
 * vite.config.js forwards them to the FastAPI server, so cookies stay same-origin.
 * This file never falls back to fixtures; data-source.js decides that.
 */

export async function request(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout || 12000)
  try {
    const response = await fetch('/api' + path, {
      credentials: 'same-origin', ...options, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const error = new Error(data?.error?.message || `Request failed (${response.status}).`)
      error.status = response.status
      throw error
    }
    if (!data) throw new Error('Unexpected response. Start WarmPath with the backend command.')
    return data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please retry.')
    throw error
  } finally { clearTimeout(timer) }
}

/* Only the read endpoints the React screens can use today. Shapes are the backend's own, unchanged. */
const api = {
  request,
  /** GET /api/session: this browser's private workspace. Sets the workspace cookie on first call. */
  session: () => request('/session'),
  /** GET /api/resources: the campus resource catalog. Needs a workspace, so call session() first. */
  resources: (saved = false) => request('/resources' + (saved ? '?saved_only=true' : '')),
  /** GET /api/events: up to 12 current public listings, with their source snapshot. */
  events: () => request('/events'),
  /** GET /api/jobs: curated public job examples. */
  jobs: () => request('/jobs'),
  /** GET /api/posts: one page of the community feed, newest first. `before` is the previous page's next_cursor. */
  posts: ({ before, limit } = {}) => {
    const query = new URLSearchParams()
    if (before) query.set('before', before)
    if (limit) query.set('limit', limit)
    return request('/posts' + (query.size ? '?' + query : ''))
  },
  /** GET /api/posts/{id}: one post. */
  post: (id) => request('/posts/' + encodeURIComponent(id)),
  /** GET /api/me: the signed-in account's profile. Rejects with status 401 when nobody is signed in. */
  me: () => request('/me'),
}

export default api
