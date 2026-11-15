/* Same-origin HTTP client. No fixture fallback: failures stay visible. */
(function () {
  async function request(path, options = {}) {
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
  window.WarmPathAPI = {
    request,
    session: () => request('/session'),
    path: (goal, job_id = null) => request('/path', { method: 'POST', body: JSON.stringify({ goal, job_id }) }),
    jobs: () => request('/jobs'),
    resources: (saved = false) => request('/resources' + (saved ? '?saved_only=true' : '')),
    events: () => request('/events'),
    save: (id, saved) => request('/saved/' + id, { method: saved ? 'PUT' : 'DELETE' }),
  }
})()
