import React from 'react'
import { PersonIcon } from './icons.jsx'

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

/*
 * The two-segment pill from DESIGN.md. Used for the demo student, the theme and the community view.
 * The selected look is a second copy of the labels, clipped to one segment. Sliding the clip
 * moves the fill and recolours the text in one motion, so a label is never dark on dark mid-slide.
 */
export function Switch({ label, options, value, onChange }) {
  const index = options.findIndex((o) => o.value === value)
  return (
    <div className="switch cap" data-index={index} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={(e) => onChange(o.value, e)}>
          {o.label}
        </button>
      ))}
      <span className="on" aria-hidden="true">{options.map((o) => <span key={o.value}>{o.label}</span>)}</span>
    </div>
  )
}

/* Initials in a circle, or a plain figure when there is no name (nobody signed in). `ring` adds the gold outline that marks your own profile. */
export function Avatar({ name, ring }) {
  const initials = name && name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return <span className="avatar" data-ring={ring || undefined} aria-hidden="true"><span>{initials || <PersonIcon />}</span></span>
}
