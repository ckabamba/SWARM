import { Hex } from '../shared/controls.jsx'

export function Node({ at, delay, stop, onOpen, total, disabled = false }) {
  const d = Math.min(90, 30 + stop.achievers * 4)
  const day = stop.event && new Date(stop.event.starts_at).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long', hour: 'numeric', minute: '2-digit' })
  return (
    <button
      className="node" data-have={stop.have} data-next={stop.next} data-side={at.side}
      style={{ transform: `translate(${at.x}px, ${at.y}px)`, '--d': `${d}px`, '--at': `${delay}ms` }}
      onClick={onOpen} disabled={disabled} aria-label={`${stop.name}: ${stop.achievers} of ${total} alumni`}
    >
      <Hex />
      <span className="tag">
        <span className="name">{stop.type === 'course' && stop.resource ? stop.resource.name.match(/^[A-Z]+\s+\d+/)?.[0] || stop.name : stop.name}</span>
        <span className="count"><b>{stop.achievers} of {total}</b> did this · {stop.type}</span>
        {stop.have && <span className="state cap">You have this</span>}
        {stop.next && <span className="state cap">Next for you</span>}
        {stop.next && day && <span className="when">{stop.event.title} · {day}, {stop.event.location}</span>}
      </span>
    </button>
  )
}
