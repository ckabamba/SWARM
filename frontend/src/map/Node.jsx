import api from '../shared/fake-api.js'
import { Hex } from '../shared/controls.jsx'

export function Node({ at, delay, stop, onOpen }) {
  const d = 30 + stop.achievers * 4
  const day = stop.event && api.eventDay(stop.event.starts_at)
  return (
    <button
      className="node" data-have={stop.have} data-next={stop.next} data-side={at.side}
      style={{ transform: `translate(${at.x}px, ${at.y}px)`, '--d': `${d}px`, '--at': `${delay}ms` }}
      onClick={onOpen}
    >
      <Hex />
      <span className="tag">
        <span className="name">{stop.name}</span>
        <span className="count"><b>{stop.achievers} of 14</b> did this · {api.TYPE_LABEL[stop.type]}</span>
        {stop.have && <span className="state cap">You have this</span>}
        {stop.next && <span className="state cap">Next for you</span>}
        {stop.next && day && <span className="when">{stop.event.title} · {day.weekdayLong} {day.time}, {stop.event.location}</span>}
      </span>
    </button>
  )
}
