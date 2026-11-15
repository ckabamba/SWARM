import { useEffect, useState } from 'react'
import * as THREE from 'three'

/* Where each stop sits, as fractions of the stage. x follows the stop's typical year. */
export const SPOTS = {
  you: { x: 0.085, y: 0.52, side: 'below' },
  5: { x: 0.255, y: 0.25, side: 'above' },
  3: { x: 0.405, y: 0.6, side: 'below' },
  4: { x: 0.63, y: 0.3, side: 'above' },
  7: { x: 0.54, y: 0.86, side: 'below' },
  9: { x: 0.745, y: 0.66, side: 'below' },
  goal: { x: 0.895, y: 0.42, side: 'above' },
}
export const STRANDS = 14      // one per alum who reached the goal
export const SAMPLES = 460     // points along each strand
export const DUST = 300        // every alum in the seed
export const HEX_R = 26        // honeycomb cell radius, centre to corner, in px

export function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* The API returns counts, not routes, so strands are dealt out to match each stop's count. */
export function dealStrands(stops) {
  const rand = mulberry(11)
  const strands = Array.from({ length: STRANDS }, () => [])
  stops.forEach((stop) => {
    const order = Array.from({ length: STRANDS }, (_, i) => i).sort(() => rand() - 0.5)
    order.slice(0, stop.achievers).forEach((i) => strands[i].push(stop.activity_id))
  })
  return strands
}

/*
 * Honeycomb cell centres, built ring by ring around the origin.
 * Adapted from prisoner849's lattice: https://jsfiddle.net/prisoner849/jzLdcemb/
 */
export function hexLattice(rings) {
  const unit = Math.sqrt(3) * HEX_R
  const angle = Math.PI / 3
  const axis = new THREE.Vector3(0, 0, 1)
  const axisVector = new THREE.Vector3(0, -unit, 0)
  const sideVector = new THREE.Vector3(0, unit, 0).applyAxisAngle(axis, -angle)
  const pts = [new THREE.Vector3()]
  const temp = new THREE.Vector3()
  for (let seg = 0; seg < 6; seg++) {
    for (let ax = 1; ax <= rings; ax++) {
      for (let sd = 0; sd < ax; sd++) {
        temp.copy(axisVector).multiplyScalar(ax).addScaledVector(sideVector, sd).applyAxisAngle(axis, angle * seg)
        pts.push(temp.clone())
      }
    }
  }
  return pts
}

/* Which cell of that lattice a point falls in. */
export function hexKey(x, y) {
  const q = ((2 / 3) * x) / HEX_R, r = (-x / 3 + (Math.sqrt(3) / 3) * y) / HEX_R
  let rq = Math.round(q), rr = Math.round(r)
  const rs = Math.round(-q - r)
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs + q + r)
  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs
  return rq + ',' + rr
}

export function useViewport() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}

/* A stop's position, moved onto the centre of the honeycomb cell it lands in. */
export function place(key, { w, h }) {
  const spot = SPOTS[key]
  const top = 100, bottom = 176
  const x = spot.x * w, y = top + spot.y * (h - top - bottom)
  const [q, r] = hexKey(x - w / 2, h / 2 - y).split(',').map(Number)
  return { x: w / 2 + HEX_R * 1.5 * q, y: h / 2 - HEX_R * Math.sqrt(3) * (r + q / 2), side: spot.side }
}
