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
    if (!data) throw new Error('WarmPath is temporarily unavailable. Please try again shortly.')
    return data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please retry.')
    if (error instanceof TypeError) throw new Error('Unable to connect to WarmPath. Check your connection and try again.')
    throw error
  } finally { clearTimeout(timer) }
}

/* The endpoints the React screens use. Shapes are the backend's own, unchanged. */
const send = (method, path, body) => request(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

const api = {
  request,
  goals: (q = '') => request('/goals?q=' + encodeURIComponent(q)),
  path: (goal_id) => send('POST', '/path', { mode: 'alumni', goal_id }),
  people: (goal_id, activity_id = null) => request('/people?goal_id=' + encodeURIComponent(goal_id) + (activity_id ? '&activity_id=' + encodeURIComponent(activity_id) : '')),
  history: () => request('/me/history'),
  activities: (q = '') => request('/activities?q=' + encodeURIComponent(q)),
  saveHistory: (kind, id, body) => send('PUT', '/me/history/' + kind + '/' + encodeURIComponent(id), body),
  courses: () => request('/me/courses'),
  saveCourse: (id, version, course) => send(id ? 'PUT' : 'POST', '/me/courses' + (id ? '/' + encodeURIComponent(id) : ''), { version, course }),
  deleteCourse: (id, version) => send('DELETE', '/me/courses/' + encodeURIComponent(id) + '?version=' + version),
  transcriptText: (text) => send('POST', '/transcripts/text', { text }),
  transcriptFile: (file) => request('/transcripts?filename=' + encodeURIComponent(file.name), { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' }, timeout: 40000 }),
  transcript: (id) => request('/transcripts/' + encodeURIComponent(id)),
  importTranscript: (id, version, selections) => send('POST', '/transcripts/' + encodeURIComponent(id) + '/import', { version, selections }),
  discardTranscript: (id) => send('DELETE', '/transcripts/' + encodeURIComponent(id)),
  asks: () => request('/asks'),
  ask: (id) => request('/asks/' + encodeURIComponent(id)),
  createAsk: (body) => send('POST', '/asks', body),
  acceptAsk: (id) => send('POST', '/asks/' + encodeURIComponent(id) + '/accept'),
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
  /** POST /api/posts: share a post as the signed-in account, whose profile must be public. `request_id` is a UUID that makes a retry safe. */
  createPost: ({ body, link_kind = null, link_key = null, request_id }) => send('POST', '/posts', { body, link_kind, link_key, request_id }),
  /** GET /api/community/options: resources a post can link to. Needs a signed-in account. */
  communityOptions: () => request('/community/options'),

  /** GET /api/me: { person_id, email, version, courses_version, profile }. Rejects with status 401 when nobody is signed in. */
  me: () => request('/me'),
  /** POST /api/auth/register: creates a private profile and signs in. Passwords are 12 to 128 characters. */
  register: ({ email, password, name }) => send('POST', '/auth/register', { email, password, name }),
  /** POST /api/auth/login: same response as me(). */
  login: ({ email, password }) => send('POST', '/auth/login', { email, password }),
  /** POST /api/auth/logout: ends this browser's session. */
  logout: () => send('POST', '/auth/logout'),
  /** PUT /api/me: replaces the profile. `version` must be the one last read; a stale one is rejected with 409. */
  saveProfile: ({ version, profile }) => send('PUT', '/me', { version, profile }),
  /** GET /api/profiles/{person_id}: the public part of someone's profile. 404 when it is private. */
  profile: (personId) => request('/profiles/' + encodeURIComponent(personId)),

  /** POST /api/resumes: a PDF or DOCX (5 MB at most) in, a private draft of suggestions out. The file is not stored. */
  uploadResume: (file) => request('/resumes?filename=' + encodeURIComponent(file.name), {
    method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' }, timeout: 40000,
  }),
  /** POST /api/resumes/{id}/import: adds the selected suggestions to the profile and deletes the draft. */
  importResume: (draftId, { version, courses_version, selections }) => send('POST', `/resumes/${encodeURIComponent(draftId)}/import`, { version, courses_version, selections }),
  /** DELETE /api/resumes/{id}: discards a draft. */
  discardResume: (draftId) => send('DELETE', '/resumes/' + encodeURIComponent(draftId)),
}

export default api
