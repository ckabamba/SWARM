import React from 'react'
import api from './fake-api.js'

/* Flat-topped hexagon with eased corners, in a 100-unit box. Matches the lattice's orientation. */
const HEX_PATH = (() => {
  const c = 50, R = 49, ease = 0.17
  const v = Array.from({ length: 6 }, (_, i) => [c + R * Math.cos((i * Math.PI) / 3), c + R * Math.sin((i * Math.PI) / 3)])
  const toward = (p, o) => `${(p[0] + (o[0] - p[0]) * ease).toFixed(2)} ${(p[1] + (o[1] - p[1]) * ease).toFixed(2)}`
  return v.map((p, i) => `${i ? 'L' : 'M'}${toward(p, v[(i + 5) % 6])}Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${toward(p, v[(i + 1) % 6])}`).join('') + 'Z'
})()

export function Hex() {
  return (
    <svg className="hex" viewBox="0 0 100 100" aria-hidden="true">
      <path className="pulse" d={HEX_PATH} />
      <path className="base" d={HEX_PATH} />
      <path className="hot" d={HEX_PATH} />
      <path className="edge" d={HEX_PATH} />
    </svg>
  )
}

export function Words({ as: Tag, className, children }) {
  return (
    <Tag className={className} aria-label={children}>
      {children.split(' ').map((word, i) => (
        <React.Fragment key={i}><span className="word" aria-hidden="true" style={{ '--i': i }}>{word}</span>{' '}</React.Fragment>
      ))}
    </Tag>
  )
}

export function Arrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10h14M11 4l6 6-6 6" />
    </svg>
  )
}

export function StudentSwitch({ students, value, onChange }) {
  const index = students.findIndex((s) => s.id === value)
  return (
    <div className="switch cap" data-index={index} role="group" aria-label="Student profile">
      <span className="thumb" />
      {students.map((s) => (
        <button key={s.id} aria-pressed={s.id === value} onClick={() => onChange(s.id)}>
          {s.major} · {api.ordinal(s.school_year)} year
        </button>
      ))}
    </div>
  )
}
