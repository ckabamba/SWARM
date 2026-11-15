import { useEffect, useRef, useState } from 'react'
import api from '../shared/api.js'

function Person({ person, goalId }) {
  const [editing,setEditing] = useState(false), [message,setMessage] = useState(person.draft || '')
  const [sent,setSent] = useState(null), [error,setError] = useState(''), [busy,setBusy] = useState(false)
  const attempt = useRef(null)
  const send = async () => {
    setBusy(true);setError('')
    attempt.current ||= {alum_id:person.id,goal_id:goalId,message,request_id:crypto.randomUUID()}
    try {setSent(await api.createAsk(attempt.current))}
    catch(e) {setError(e.message);if(e.status && e.status < 500) attempt.current=null}
    finally {setBusy(false)}
  }
  return <section className="person"><header><h3>{person.name}</h3><span className="who">{person.major} {person.grad_year}</span></header><p className="tie">{person.shared_tie}</p>
    {sent ? <p role="status">Ask sent. <a href={`#/reply/${sent.id}`}>View status</a></p> : person.can_ask && <>
      {!editing && <button className="pill" onClick={() => setEditing(true)}>Ask {person.name}</button>}
      {editing && <div className="draft" data-open="true"><div><textarea aria-label={`Message to ${person.name}`} value={message} maxLength={2000} disabled={busy || !!attempt.current} onChange={e => setMessage(e.target.value)}/><div className="acts"><button className="pill" disabled={busy} onClick={() => setEditing(false)}>Cancel</button><button className="pill hot" disabled={busy || !message.trim()} onClick={send}>{busy ? 'Sending...' : 'Send the ask'}</button></div></div></div>}
    </>}{error && <p role="alert">{error}</p>}
  </section>
}
export function LivePeoplePanel({open,path,activityId,onClose}) {
  const [people,setPeople] = useState(null), [error,setError] = useState(''), [retry,setRetry] = useState(0)
  useEffect(() => {
    if(!open) return
    let current=true;setPeople(null);setError('')
    api.people(path.goal.id,activityId === 'goal' ? null : activityId).then(r => {if(current)setPeople(r.items)}, e => {if(current)setError(e.message)})
    return () => {current=false}
  },[open,path.goal.id,activityId,retry])
  const stop=path.stops.find(s=>s.activity_id===activityId)
  return <aside className="panel" data-open={open} aria-label="Matching alumni" aria-hidden={!open} inert={!open}>
    <button className="close cap" onClick={onClose}>Close</button><h2>{stop?.name || path.goal.label}</h2>
    <p className="lede">{path.fixture_evidence ? 'Synthetic demo alumni. These invented people cannot receive real asks.' : 'Public alumni with explicitly shared histories. Participation is self-reported.'}</p>
    {error ? <><p role="alert">{error}</p><button className="pill" onClick={()=>setRetry(n=>n+1)}>Retry</button></> : people === null ? <p role="status">Loading alumni...</p> : people.length ? people.map(p=><Person key={`${path.goal.id}:${activityId}:${p.id}`} person={p} goalId={path.goal.id}/>) : <p>No eligible alumni are available for this selection.</p>}
  </aside>
}
