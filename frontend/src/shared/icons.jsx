/* Line icons on a 20-unit grid, 1.5 stroke, drawn in the current text colour. */

/* Flat-topped hexagon, the same orientation as the lattice. */
export function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

function Icon({ children }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function HexIcon({ filled }) {
  return <Icon><polygon points={hexPoints(10, 10, 7.5)} fill={filled ? 'currentColor' : 'none'} /></Icon>
}

/* Three cells of the comb: the community. */
export function HiveIcon() {
  const r = 3.7
  return (
    <Icon>
      <polygon points={hexPoints(6.9, 6.8, r)} />
      <polygon points={hexPoints(6.9, 6.8 + Math.sqrt(3) * r, r)} />
      <polygon points={hexPoints(6.9 + 1.5 * r, 6.8 + (Math.sqrt(3) / 2) * r, r)} />
    </Icon>
  )
}

export function SearchIcon() {
  return <Icon><circle cx="9" cy="9" r="5.5" /><path d="M13.2 13.2 17 17" /></Icon>
}

export function CloseIcon() {
  return <Icon><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" /></Icon>
}
