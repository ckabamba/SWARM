import { useEffect, useMemo, useState } from 'react'
import api from '../shared/fake-api.js'
import '../shared/theme.js'
import { Experience } from '../map/Experience.jsx'
import { Community } from '../community/Community.jsx'
import { Reply } from '../people/Reply.jsx'

export default function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // The demo student is shared by every page, so the account button means the same person everywhere.
  const students = useMemo(() => api.getStudents(), [])
  const [studentId, setStudentId] = useState(students[0].id)
  const who = { students, studentId, onStudent: setStudentId }

  const reply = hash.match(/^#\/reply\/(\d+)/)
  const community = hash === '#/community'
  return (
    <>
      {/* The path page stays mounted so a traced goal survives a visit to another page. */}
      <Experience active={!reply && !community} {...who} />
      {community && <Community {...who} />}
      {reply && <Reply id={reply[1]} />}
    </>
  )
}
