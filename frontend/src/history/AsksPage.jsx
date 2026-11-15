import { useEffect, useState } from 'react'
import api from '../shared/api.js'
import { useAccount } from '../shared/account.js'
import { Access, Frame, Notice } from './Shared.jsx'

function AskCard({ item, refresh, detail = false }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const accept = async () => { setBusy(true); setError(''); try { await api.acceptAsk(item.id); await refresh() } catch (e) { setError(e.message) } finally { setBusy(false) } }
  return <article className="connected-card"><div className="connected-row"><h2>{item.sender.name} to {item.recipient.name}</h2><span className="cap">{item.status}</span></div>
    <p>{item.goal.label}</p><p className="connected-message">{item.message}</p>
    <p className="quiet">Sent {new Date(item.created_at).toLocaleString()}{item.accepted_at ? ' / accepted ' + new Date(item.accepted_at).toLocaleString() : ''}</p>
    <Notice error={error}/>{item.can_accept && <button className="pill hot" disabled={busy} onClick={accept}>{busy ? 'Accepting...' : 'Accept conversation'}</button>}
    {!detail && <a className="pill" href={'#/reply/' + item.id}>Open ask</a>}
    {item.status === 'accepted' && <p role="status">Accepted. WarmPath records your response; scheduling and contact exchange happen separately.</p>}
  </article>
}
function Content({ id }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const load = async () => { const value = id ? await api.ask(id) : await api.asks(); setData(value); setError(''); return value }
  useEffect(() => {
    let active = true
    const refresh = () => { if (!document.hidden) (id ? api.ask(id) : api.asks()).then(value => { if (active) { setData(value); setError('') } }).catch(e => { if (active) setError(e.message) }) }
    setData(null); refresh(); const timer = setInterval(refresh, 15000)
    return () => { active = false; clearInterval(timer) }
  }, [id])
  const more = async () => {
    setBusy(true); try { const next = await api.request('/asks?before=' + data.next_cursor); setData({ items: [...data.items, ...next.items], next_cursor: next.next_cursor }); setError('') }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <><Notice error={error}/><button className="pill" onClick={() => load().catch(e => setError(e.message))}>Refresh asks</button>
    {!data && !error && <p role="status">Loading asks...</p>}
    {id ? data && <AskCard item={data} refresh={load} detail/> : data && <>{!data.items.length && <p className="connected-card">No asks yet. <a href="#">Explore alumni paths</a> to find people to contact.</p>}{data.items.map(item => <AskCard key={item.id} item={item} refresh={load}/>)}{data.next_cursor && <button className="pill" disabled={busy} onClick={more}>Load older asks</button>}</>}
  </>
}
export function AsksPage({ who, id }) {
  const { me, status } = useAccount()
  return <Frame title={id ? 'Your conversation request' : 'Your asks'} active="asks" who={who} intro="Only you and the other participant can read these requests. Status refreshes every 15 seconds.">
    {id && <p><a href="#/asks">All your asks</a></p>}<Access><Content key={(me?.person_id || status) + ':' + (id || 'all')} id={id}/></Access>
  </Frame>
}
