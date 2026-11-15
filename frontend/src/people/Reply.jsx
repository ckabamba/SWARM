import { useEffect, useState } from 'react'
import api from '../shared/fake-api.js'
import { Backdrop } from '../shared/Backdrop.jsx'

export function Reply({ id }) {
  const [ask, setAsk] = useState(() => api.getAsk(id))
  useEffect(() => { document.body.dataset.view = 'reply' }, [])
  useEffect(() => { document.body.dataset.accepted = ask.status === 'accepted' }, [ask.status])
  useEffect(() => api.subscribe(() => setAsk(api.getAsk(id))), [id])
  const first = ask.student.name.split(' ')[0]
  const accepted = ask.status === 'accepted'
  return (
    <>
      <Backdrop />
      <div className="veil" />
      <main className="ui reply">
        <article>
          <span className="mark"><i />WarmPath</span>
          <h1>{ask.student.name} would like 15 minutes of your time.</h1>
          <p className="who">{ask.student.major}, {api.ordinal(ask.student.school_year)} year at Georgia Tech</p>
          <dl>
            <dt className="cap">What you share</dt>
            <dd className="tie">{ask.shared_tie.replace(/^You are both/, 'You are both').replace('your next stop', `${first}’s next stop`)}</dd>
            <dt className="cap">{first}’s question</dt>
            <dd className="msg">{ask.message}</dd>
          </dl>
          <button className="accept" disabled={accepted} onClick={() => setAsk(api.acceptAsk(id))}>
            {accepted ? 'Accepted' : 'Accept a 15-minute call'}
          </button>
          <p className="after">{accepted ? `${first} can see that you said yes.` : 'One tap. No account needed.'}</p>
        </article>
      </main>
    </>
  )
}
