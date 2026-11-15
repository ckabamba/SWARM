import { useId } from 'react'

/*
 * The yellow jacket that pushes one list out of the stream and tows the next one in.
 * It is drawn facing right; community.css turns it around when it flies left, sizes it,
 * and moves its lane with the same transform as the two lists.
 */
export function Bee() {
  const body = `bee-body-${useId().replace(/[^a-z0-9]/gi, '')}`
  return (
    <div className="bee-lane" aria-hidden="true">
      <div className="bee">
        <svg viewBox="0 0 30 22">
          <clipPath id={body}><ellipse cx="13.5" cy="13.5" rx="9" ry="5.8" /></clipPath>
          <path className="bee-dark" d="M4.8 13.5 1.6 12.4v2.2z" />
          <g transform="rotate(-18 12 11)"><ellipse className="bee-wing" cx="12" cy="6.2" rx="3.6" ry="5.4" /></g>
          <g transform="rotate(8 16.5 11)"><ellipse className="bee-wing bee-wing-far" cx="16.5" cy="6.8" rx="3" ry="4.6" /></g>
          <ellipse className="bee-gold" cx="13.5" cy="13.5" rx="9" ry="5.8" />
          <g clipPath={`url(#${body})`} className="bee-stripe"><path d="M10.5 6v15M15.5 6v15" /></g>
          <circle className="bee-dark" cx="23.6" cy="13" r="3.5" />
          <path className="bee-feeler" d="M25 10.2c.6-1.8 1.6-2.8 3-3.2M23.4 9.6c.2-1.9 1-3.1 2.2-3.8" />
        </svg>
      </div>
    </div>
  )
}
