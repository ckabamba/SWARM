import { Node } from './Node.jsx'
import { Hex } from '../shared/controls.jsx'
import './connected-map.css'

// Aggregate associations only: the API does not supply individual alumni routes.
export function ConnectedPathMap({ path, onPeople, busy }) {
  const stops = [...path.stops].sort((a, b) => (a.typical_year ?? Infinity) - (b.typical_year ?? Infinity) || a.activity_id - b.activity_id)
  const height = Math.max(360, stops.length * 190 + 80)
  const goal = { x: 620, y: height / 2 }
  return <><p className="quiet">For {path.student.name}. Earlier activities connect to the shared goal; lines show associations, not individual routes or a required sequence. Select a hexagon to meet alumni.</p>
    <div className="live-map-scroll" role="region" aria-label="Path map; scroll horizontally on smaller screens" tabIndex={0}>
      <div className="live-map" style={{ height }}>
        <svg className="live-map-lines" width="880" height={height} aria-hidden="true">
          {stops.map((stop, i) => <path key={stop.activity_id} d={`M170 ${90 + i * 190} C380 ${90 + i * 190} 420 ${goal.y} ${goal.x} ${goal.y}`} />)}
        </svg>
        {stops.map((stop, i) => <Node key={stop.activity_id} stop={stop} total={path.goal.achievers} at={{ x:170, y:90 + i * 190, side:'below' }} delay={0} disabled={busy} onOpen={() => onPeople(stop.activity_id, stop.name)}/>)}
        <button className="node end" data-side="below" style={{ transform:`translate(${goal.x}px, ${goal.y}px)`, '--d':'90px' }} disabled={busy} onClick={() => onPeople(null, path.goal.label)}>
          <Hex/><span className="tag"><span className="name">{path.goal.label}</span><span className="count"><b>{path.goal.achievers} alumni</b> shared this goal</span></span>
        </button>
      </div>
    </div></>
}
