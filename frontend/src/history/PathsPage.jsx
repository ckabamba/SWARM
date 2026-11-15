import { useEffect, useRef, useState } from 'react'
import api from '../shared/api.js'
import { useAccount } from '../shared/account.js'
import { Experience } from '../map/Experience.jsx'

export function PathsPage({ who }) {
  const { me, status } = useAccount()
  return <LiveExperience key={me?.person_id || status} who={who}/>
}
function LiveExperience({ who }) {
  const [query,setQuery] = useState(''), [path,setPath] = useState(null)
  const [match,setMatch] = useState(null), [error,setError] = useState(''), [busy,setBusy] = useState(false)
  const [demo,setDemo] = useState(false)
  useEffect(() => { let active=true; api.request('/health').then(r=>{if(active)setDemo(!!r.synthetic_histories)}).catch(()=>{}); return ()=>{active=false} },[])
  const generation = useRef(0)
  const submit = async (goalId) => {
    const token = ++generation.current
    setBusy(true); setError(''); setPath(null); setMatch(null)
    try {
      const result = goalId ? {path:await api.path(goalId),match:null} : await api.matchPath(query.trim())
      if(token === generation.current) { setPath(result.path);setMatch(result.match) }
    } catch(e) { if(token === generation.current) setError(e.message) }
    finally { if(token === generation.current) setBusy(false) }
  }
  return <Experience {...who} live={{query,setQuery,path,match,error,busy,submit,demo}}/>
}
