import { useEffect, useRef } from 'react'
import api from '../shared/fake-api.js'
import { EVENTS, PROFILES, RECORDS } from './data.js'

function when(event) {
  const day = api.eventDay(event.starts_at)
  return `${day.weekdayLong}, ${day.month} ${day.day} at ${day.time}`
}

/* The right-edge drawer from the path page, showing one profile, event or club. */
export function Details({ detail, onClose, onOpen }) {
  // Keep the last content on screen while the drawer slides away.
  const last = useRef(detail)
  if (detail) last.current = detail
  const shown = detail || last.current
  const close = useRef(null)

  useEffect(() => {
    if (detail) close.current.focus({ preventScroll: true })
  }, [detail])

  const profile = shown && shown.kind === 'profile' ? PROFILES[shown.id] : null
  const record = shown && shown.kind === 'record' ? RECORDS.get(shown.id) : null
  const club = record && record.type === 'event' && record.clubId ? RECORDS.get(record.clubId) : null
  const clubEvents = record && record.type !== 'event' ? EVENTS.filter((event) => event.clubId === record.id) : []

  return (
    <aside className="panel details" data-open={Boolean(detail)} aria-hidden={!detail} inert={!detail} aria-label="Details">
      <button className="close cap" ref={close} onClick={onClose}>Close</button>

      {profile && (
        <>
          <h2>{profile.name}</h2>
          <p className="lede">{profile.note}</p>
          <dl>
            <div><dt className="cap">Major</dt><dd>{profile.majorName}</dd></div>
            <div><dt className="cap">Year</dt><dd className="sentence">{profile.year}</dd></div>
            <div><dt className="cap">About</dt><dd>{profile.summary}</dd></div>
          </dl>
        </>
      )}

      {record && record.type === 'event' && (
        <>
          <h2>{record.title}</h2>
          <p className="lede">Hosted by {record.organizer}.</p>
          <dl>
            <div><dt className="cap">When</dt><dd>{when(record)}</dd></div>
            <div><dt className="cap">Where</dt><dd>{record.location}</dd></div>
            <div><dt className="cap">Source</dt><dd>{record.source}</dd></div>
            <div><dt className="cap">Record</dt><dd>{record.id}</dd></div>
          </dl>
          {club && <button className="pill" onClick={() => onOpen({ kind: 'record', id: club.id })}>About {club.title}</button>}
        </>
      )}

      {/* Clubs, and campus resources linked from a backend post. */}
      {record && record.type !== 'event' && (
        <>
          <h2>{record.title}</h2>
          <p className="lede">{record.summary}</p>
          <dl>
            {clubEvents.map((event) => (
              <div key={event.id}>
                <dt className="cap">Coming up</dt>
                <dd><button className="inline-link" onClick={() => onOpen({ kind: 'record', id: event.id })}>{event.title}</button>, {when(event)}</dd>
              </div>
            ))}
            <div><dt className="cap">Source</dt><dd>{record.source}</dd></div>
            <div><dt className="cap">Record</dt><dd>{record.id}</dd></div>
          </dl>
        </>
      )}

      {record && <p className="details-note">Opening this on the campus map is not built yet.</p>}
    </aside>
  )
}
