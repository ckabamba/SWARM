import { useEffect, useRef, useState } from 'react'
import api from '../shared/api.js'
import { ConnectedPathMap } from '../map/ConnectedPathMap.jsx'
import { useAccount } from '../shared/account.js'
import { Access, Frame, Notice } from './Shared.jsx'

function Person({ person, goal }) {
  const [message, setMessage] = useState(person.draft)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(null)
  const attempt = useRef(null)
  const send = async e => {
    e.preventDefault(); setBusy(true); setError('')
    const payload = { alum_id: person.id, goal_id: goal.id, message }
    // Keep the same ID and message after a lost response so retrying cannot send twice.
    if (!attempt.current) attempt.current = { ...payload, request_id: crypto.randomUUID() }
    try { setSent(await api.createAsk(attempt.current)) }
    catch (e) { setError(e.message); if (e.status && e.status < 500) attempt.current = null }
    finally { setBusy(false) }
  }
  return <article className="connected-card"><h3>{person.name}</h3><p>{[person.major, person.grad_year].filter(Boolean).join(' / ')}</p>
    {person.shared_tie && <p className="connected-tie">{person.shared_tie}</p>}
    {sent ? <p role="status">Ask sent. <a href={'#/reply/' + sent.id}>View status</a></p> : person.can_ask ? <form className="connected-form" onSubmit={send}>
      <label>Your ask to {person.name}<textarea maxLength={2000} required value={message} disabled={busy || !!attempt.current} onChange={e => setMessage(e.target.value)}/></label>
      <small>This editable draft uses the shared profile information above. Sending creates an ask in WarmPath; it does not send email.</small>
      <Notice error={error}/><button className="pill" disabled={busy || !message.trim()}>{busy ? 'Sending...' : attempt.current ? 'Retry this ask' : 'Send ask'}</button>
    </form> : <p className="quiet">This member is not available for asks.</p>}
  </article>
}

function PathsContent() {
  const [query, setQuery] = useState(''), [goals, setGoals] = useState(null), [selected, setSelected] = useState('')
  const [path, setPath] = useState(null), [people, setPeople] = useState(null), [peopleTitle, setPeopleTitle] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [match, setMatch] = useState(null)
  const generation = useRef(0)
  const goalGeneration = useRef(0)
  const search = async e => {
    e?.preventDefault(); const token = ++goalGeneration.current
    try { const result = await api.goals(); if (token === goalGeneration.current) setGoals(result.items) } catch (e) { if (token === goalGeneration.current) setError(e.message) }
  }
  useEffect(() => { search(); return () => { generation.current++; goalGeneration.current++ } }, [])
  const resolve = async e => {
    e.preventDefault(); const token = ++generation.current
    setBusy(true); setError(''); setMatch(null); setPath(null); setPeople(null); setSelected('')
    try {
      const result = await api.matchPath(query.trim())
      if (token === generation.current) { setMatch(result.match); setPath(result.path) }
    } catch (e) { if (token === generation.current) setError(e.message) }
    finally { if (token === generation.current) setBusy(false) }
  }
  const trace = async e => {
    e.preventDefault(); const token = ++generation.current
    setBusy(true); setError(''); setPath(null); setPeople(null)
    try { const result = await api.path(Number(selected)); if (token === generation.current) { setPath(result); setMatch(null) } }
    catch (e) { if (token === generation.current) setError(e.message) }
    finally { if (token === generation.current) setBusy(false) }
  }
  const showPeople = async (activity, title) => {
    const token = ++generation.current
    setBusy(true); setError(''); setPeople(null); setPeopleTitle(title)
    try { const result = await api.people(path.goal.id, activity); if (token === generation.current) setPeople(result.items) }
    catch (e) { if (token === generation.current) setError(e.message) }
    finally { if (token === generation.current) setBusy(false) }
  }
  return <><div className="connected-grid"><form className="connected-card connected-form" onSubmit={resolve}>
    <label>Describe your alumni goal<input required type="search" maxLength={300} value={query} onChange={e => setQuery(e.target.value)} placeholder="Role, company, course or activity"/></label>
    <button className="pill" disabled={busy || !query.trim()}>Trace the path</button>
  </form><form className="connected-card connected-form" onSubmit={trace}>
    <label>Goal<select aria-label="Goal" value={selected} disabled={busy} onChange={e => { generation.current++; setSelected(e.target.value); setPath(null); setPeople(null) }}>
      <option value="">Choose a goal</option>{(match?.status === 'ambiguous' ? match.candidates : goals)?.map(g => <option value={g.id} key={g.id}>{g.label}{g.achievers != null ? ` (${g.achievers} alumni)` : ''}</option>)}
    </select></label><button className="pill hot" disabled={busy || !selected}>Explore path</button>
  </form></div><Notice error={error}/>{busy && <p role="status">Loading...</p>}
    {match?.status === 'ambiguous' && <p role="status">Several shared goals may fit. Choose one above to trace its path.</p>}
    {match?.status === 'no_match' && <p role="status">No shared alumni goal matches this text. Try another description or choose an available goal. You can also <a href="/thermal/">browse campus resources</a>.</p>}
    {match?.fallback_reason && <p className="quiet">Semantic matching is unavailable; these results use keyword matching.</p>}
    {goals?.length === 0 && <p className="connected-card">No shared alumni goals match yet. Alumni can add experiences or courses in <a href="#/history">My history</a>, confirm their timing, and choose to share them from a public profile. You can still <a href="/thermal/">browse campus resources</a>.</p>}
    {path && <section aria-label="Alumni path"><header className="connected-card"><span className="cap">Self-reported histories</span><h2>{path.goal.label}</h2>
      <p>{path.goal.achievers} alumni shared this activity. Counts cover public alumni with shared history; they do not prove an activity caused an outcome.</p>
      <button className="pill" disabled={busy} onClick={() => showPeople(null, path.goal.label)}>People behind this goal</button>
    </header>
      {path.reason && <p role="status">{path.reason === 'not_enough_achievers' ? 'At least three alumni with eligible shared histories are needed before stops can be shown.' : 'No earlier activity meets the current count and lift thresholds.'}</p>}
      <ConnectedPathMap path={path} onPeople={showPeople} busy={busy}/>
      {!!path.stops.length && <><p className="quiet">Earlier activities ranked by lift. These are associations, not a required sequence. Your private confirmed history marks activities you already have.</p>
        <div className="connected-stops">{path.stops.map(stop => <article className="connected-stop" key={stop.activity_id} data-have={stop.have} data-next={stop.next}>
          <svg viewBox="0 0 60 52" aria-hidden="true"><path d="M15 1H45L59 26L45 51H15L1 26Z"/></svg>
          <h3>{stop.name}</h3><p><strong>{stop.achievers} of {path.goal.achievers}</strong> did this before the goal</p><p className="quiet">{stop.lift}x lift / typical academic year {stop.typical_year}</p>
          {stop.have && <span className="cap">You have this</span>}{stop.next && <span className="cap">Next to explore</span>}
          <button className="pill" disabled={busy} onClick={() => showPeople(stop.activity_id, stop.name)}>Meet alumni</button>
        </article>)}</div></>}
    </section>}
    {people && <section aria-label="Matching alumni"><h2>{peopleTitle}</h2>{!people.length && <p>No other alumni currently share an eligible history for this selection.</p>}<div className="connected-grid">{people.map(p => <Person key={p.id + ':' + path.goal.id} person={p} goal={path.goal}/>)}</div></section>}
  </>
}

export function PathsPage({ who }) {
  const { me, status } = useAccount()
  return <Frame title="Alumni paths" active="path" who={who} intro="Explore activities shared by alumni, then reach out through a connection you can explain.">
    <p><a href="/thermal/">Campus resource discovery</a> / <a href="#/history">Review your path history</a></p>
    <Access><PathsContent key={me?.person_id || status}/></Access>
  </Frame>
}
