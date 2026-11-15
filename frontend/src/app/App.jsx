import { useEffect, useState } from 'react'
import { Experience } from '../map/Experience.jsx'
import { Reply } from '../people/Reply.jsx'

export default function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const reply = hash.match(/^#\/reply\/(\d+)/)
  return reply ? <Reply id={reply[1]} /> : <Experience />
}
