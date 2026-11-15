import { Hex } from '../shared/controls.jsx'
import { Person } from '../people/LivePeoplePanel.jsx'
import { place } from './layout.js'

export function peerLayout(peers, mobile) {
  const spots = {you:{x:mobile ? .12 : .09,y:.48,side:'below'},goal:{x:.88,y:.5,side:'below'}}
  const routes = peers.map((person,i) => {
    const y = peers.length === 1 ? .48 : mobile ? .26 + i * .44 / (peers.length - 1) : .08 + i * .80 / (peers.length - 1)
    const key = `peer-${person.id}`, tie = `tie-${person.id}`
    spots[key] = {x:mobile ? .76 : .84,y,side:'below'}
    spots[tie] = {x:mobile ? .40 : .46,y,side:'above'}
    return person.shared.length ? ['you',tie,key] : ['you',key]
  })
  return {spots,routes}
}

export function AlumniNodes({peers,spots,viewport,onOpen}) {
  return peers.map(person => {
    const point = place(`peer-${person.id}`,viewport,spots)
    const tie = person.shared[0], midpoint = place(`tie-${person.id}`,viewport,spots)
    const label = tie && (tie.resource_name || tie.name)
    return <div key={person.id}>
      {tie && <button className="node peer-tie" data-side="above" style={{transform:`translate(${midpoint.x}px, ${midpoint.y}px)`,'--d':'34px','--at':'0ms'}} onClick={()=>onOpen(person.id)} aria-label={`Shared with ${person.name}: ${label}`}>
        <Hex/><span className="tag"><span className="name">{label.match(/^[A-Z]+\s+\d+/)?.[0] || label}</span><span className="count">In common</span></span>
      </button>}
      <button className="node end peer-node" data-side="below" style={{transform:`translate(${point.x}px, ${point.y}px)`,'--d':'52px','--at':'0ms'}} onClick={()=>onOpen(person.id)} aria-label={`Connect with ${person.name}`}>
        <Hex/><span className="tag"><span className="name">{person.name}</span><span className="count">{person.goal.label}</span></span>
      </button>
    </div>
  })
}

export function AlumniPanel({person,onClose}) {
  return <aside className="panel" data-open={!!person} aria-label="Alumni connection" aria-hidden={!person} inert={!person}>
    <button className="close cap" onClick={onClose}>Close</button>
    {person && <><h2>{person.goal.label}</h2><p className="lede">{person.evidence === 'synthetic_demo' ? 'Synthetic demo profile. This invented alumnus cannot receive real asks.' : 'Public, self-reported alumni history.'}</p>
      <Person key={person.id} person={person} goalId={person.goal.id}/>
      {person.shared.length > 0 && <><h3>What you have in common</h3><ul>{person.shared.map(tie=><li key={tie.id}>{tie.url ? <a href={tie.url} target="_blank" rel="noreferrer">{tie.resource_name || tie.name}</a> : tie.name}</li>)}</ul></>}
      {!person.can_ask && <p className="quiet">Direct outreach is unavailable for this profile.</p>}
    </>}
  </aside>
}
