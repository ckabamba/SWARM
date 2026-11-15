import { useEffect, useState } from 'react'
import api from '../shared/fake-api.js'

export function PeoplePanel({ open, path, activityId, onClose }) {
  const [, bump] = useState(0)
  const [composing, setComposing] = useState(null)
  const [text, setText] = useState('')
  useEffect(() => api.subscribe(() => bump((n) => n + 1)), [])
  useEffect(() => setComposing(null), [activityId, path.student.id])

  const stop = path.stops.find((s) => s.activity_id === activityId)
  const people = api.getPeople({ goal_id: path.goal.id, student_id: path.student.id, activity_id: stop ? activityId : undefined })
  const asks = api.asksByAlum(path.student.id)
  const total = stop ? stop.achievers : path.goal.achievers
  const shown = people.slice(0, 4)

  const send = (person) => {
    api.postAsk({ student_id: path.student.id, alum_id: person.id, goal_id: path.goal.id, message: text })
    setComposing(null)
  }

  return (
    <aside className="panel" data-open={open} aria-hidden={!open} inert={!open}>
      <button className="close cap" onClick={onClose}>Close</button>
      <h2>{stop ? stop.name : path.goal.label}</h2>
      <p className="lede">
        {stop
          ? `${total} of the ${path.goal.achievers} alumni who reached this goal went through here.`
          : `${total} alumni in the seed reached this goal.`} Closest starting point to yours first.
      </p>
      {shown.map((person) => {
        const ask = asks[person.id]
        const isOpen = composing === person.id
        return (
          <section className="person" key={person.id}>
            <header>
              <h3>{person.name}</h3>
              <span className="who">{person.company} ? {person.major} ’{String(person.grad_year).slice(2)}</span>
            </header>
            <p className="tie">{person.shared_tie}</p>
            {ask ? (
              <p className="status" data-status={ask.status}>
                <i />
                {ask.status === 'accepted' ? 'Accepted a 15-minute call' : 'Sent. Waiting for a reply.'}
                {ask.status !== 'accepted' && <a href={`#/reply/${ask.id}`} target="_blank" rel="noreferrer">Open the reply page</a>}
              </p>
            ) : (
              !isOpen && <button className="pill" onClick={() => { setComposing(person.id); setText(person.draft) }}>Ask {person.name.split(' ')[0]}</button>
            )}
            <div className="draft" data-open={isOpen && !ask}>
              <div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label={`Message to ${person.name}`} tabIndex={isOpen ? 0 : -1} />
                <div className="acts">
                  <button className="pill" onClick={() => setComposing(null)} tabIndex={isOpen ? 0 : -1}>Cancel</button>
                  <button className="pill hot" onClick={() => send(person)} tabIndex={isOpen ? 0 : -1}>Send the ask</button>
                </div>
              </div>
            </div>
          </section>
        )
      })}
      {total > shown.length && <p className="more">Showing the {shown.length} closest of {total}.</p>}
    </aside>
  )
}
