import { useEffect } from 'react'
import { TopBar } from '../shared/TopBar.jsx'
import { openAccount, refreshAccount, useAccount } from '../shared/account.js'
import './history.css'

export function Frame({ title, active, who, children, intro }) {
  useEffect(() => { document.body.dataset.view = 'connected'; document.title = title + ' - WarmPath' }, [title])
  return <div className="connected-root"><TopBar active={active} {...who}/><main className="connected-page"><header className="connected-heading"><span className="cap">WarmPath</span><h1>{title}</h1>{intro && <p>{intro}</p>}</header>{children}</main></div>
}
export function Access({ children }) {
  const { status, error } = useAccount()
  if (status === 'loading') return <p role="status">Loading your account...</p>
  if (status === 'error') return <section className="connected-card"><p role="alert">{error || 'Unable to load your account.'}</p><button className="pill" onClick={() => refreshAccount().catch(() => {})}>Retry account</button></section>
  if (status !== 'in') return <section className="connected-card"><h2>Sign in to continue</h2><p>Your history and outreach belong to your account.</p><button className="pill hot" onClick={openAccount}>Sign in or create an account</button></section>
  return children
}
export function Notice({ error, notice }) {
  return <>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</>
}
export const nullableNumber = value => value === '' || value == null ? null : Number(value)
export function HistoryFields({ form, setForm }) {
  return <><label>School year<input type="number" min="1" max="80" value={form.school_year ?? ''} onChange={e => setForm({ ...form, school_year: nullableNumber(e.target.value) })}/><small>1 is your first academic year; 5+ is after a typical four-year program. Leave blank only when dates and enrollment year can establish it.</small></label><label className="check"><input type="checkbox" checked={!!form.history_confirmed} onChange={e => setForm({ ...form, history_confirmed: e.target.checked })}/>I confirm this participation and timing for my path history</label><label className="check"><input type="checkbox" checked={!!form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })}/>Share this entry on my public profile and alumni paths</label></>
}
