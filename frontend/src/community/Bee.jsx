/*
 * The yellow jacket that crosses the stream when the view switches. It flies the way the
 * switch moved, does one loop over the middle, and trails a short run of dots.
 * Everything is CSS: the bee follows the path with offset-path, and the dots are the same
 * path seen through a window that slides along it. See .bee-lane in community.css.
 */

/* One pass across a lane `w` wide and 72 tall, as an SVG path. `dir` is 1 for left to right, -1 for right to left. */
function flightPath(w, dir) {
  const cx = w / 2
  const x = (v) => (dir > 0 ? v : w - v).toFixed(1)
  return [
    `M${x(-24)} 60`,
    `C${x(0.14 * w)} 12 ${x(cx - 105)} 50 ${x(cx - 50)} 50`,   // dip in from the edge
    `C${x(cx + 30)} 50 ${x(cx + 48)} 4 ${x(cx)} 4`,            // up and over
    `C${x(cx - 48)} 4 ${x(cx - 30)} 50 ${x(cx + 50)} 50`,      // back under: the loop
    `C${x(cx + 105)} 50 ${x(0.86 * w)} 16 ${x(w + 24)} 30`,    // climb out the far edge
  ].join(' ')
}

export function Bee({ flight, onDone }) {
  const d = flightPath(flight.width, flight.dir)
  const windowId = `bee-window-${flight.id}`, bodyId = `bee-body-${flight.id}`
  return (
    <div className="bee-lane" aria-hidden="true" onAnimationEnd={(e) => { if (e.animationName === 'bee-tail') onDone(flight.id) }}>
      <svg className="bee-trail" width={flight.width} height="72">
        <mask id={windowId} maskUnits="userSpaceOnUse" x="-40" y="-20" width={flight.width + 80} height="112">
          <path className="bee-window" d={d} pathLength="1" />
        </mask>
        <path className="bee-dots" d={d} mask={`url(#${windowId})`} />
      </svg>
      <div className="bee" data-dir={flight.dir} style={{ offsetPath: `path('${d}')` }}>
        <svg viewBox="0 0 30 22">
          <clipPath id={bodyId}><ellipse cx="13.5" cy="13.5" rx="9" ry="5.8" /></clipPath>
          <path className="bee-dark" d="M4.8 13.5 1.6 12.4v2.2z" />
          <g transform="rotate(-18 12 11)"><ellipse className="bee-wing" cx="12" cy="6.2" rx="3.6" ry="5.4" /></g>
          <g transform="rotate(8 16.5 11)"><ellipse className="bee-wing bee-wing-far" cx="16.5" cy="6.8" rx="3" ry="4.6" /></g>
          <ellipse className="bee-gold" cx="13.5" cy="13.5" rx="9" ry="5.8" />
          <g clipPath={`url(#${bodyId})`} className="bee-stripe"><path d="M10.5 6v15M15.5 6v15" /></g>
          <circle className="bee-dark" cx="23.6" cy="13" r="3.5" />
          <path className="bee-feeler" d="M25 10.2c.6-1.8 1.6-2.8 3-3.2M23.4 9.6c.2-1.9 1-3.1 2.2-3.8" />
        </svg>
      </div>
    </div>
  )
}
