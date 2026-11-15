import { Spot } from '../types/warmpath';

export const HEX_R = 26;

// Flat-topped honeycomb positions ported from prototypes/thermal/index.html
export const SPOTS: Record<string, Spot> = {
  you: { x: 0.08, y: 0.5, side: 'left' },
  '5': { x: 0.22, y: 0.68, side: 'below' }, // RoboJackets (typical year 1)
  '3': { x: 0.36, y: 0.32, side: 'above' }, // VIP: Embedded Vision (typical year 2)
  '4': { x: 0.54, y: 0.28, side: 'above' }, // VIP: GPU Systems (typical year 3)
  '7': { x: 0.68, y: 0.72, side: 'below' }, // CS 3210 (typical year 3)
  '9': { x: 0.8, y: 0.42, side: 'above' }, // Comp Arch Lab (typical year 3)
  goal: { x: 0.9, y: 0.5, side: 'below' }, // NVIDIA SWE Internship
};

/**
 * Generates an SVG path string for a flat-topped hexagon.
 * Flat top/bottom: edges at top and bottom are horizontal.
 */
export function getHexPath(cx: number, cy: number, r: number = HEX_R): string {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    // Angles 0, 60, 120, 180, 240, 300 degrees produce flat top and bottom
    const angle = (Math.PI / 3) * i;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} ` +
    points.slice(1).map((p) => `L ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') +
    ' Z';
}

/**
 * Which cell of the lattice a point falls into.
 */
export function hexKey(x: number, y: number): string {
  const q = ((2 / 3) * x) / HEX_R;
  const r = (-x / 3 + (Math.sqrt(3) / 3) * y) / HEX_R;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(-q - r);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs + q + r);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return `${rq},${rr}`;
}

/**
 * Generates grid points for honeycomb lattice cells across given dimensions.
 */
export function generateHexLattice(width: number, height: number): { x: number; y: number; key: string }[] {
  const colStep = HEX_R * 1.5;
  const rowStep = Math.sqrt(3) * HEX_R;
  const cols = Math.ceil(width / colStep) + 2;
  const rows = Math.ceil(height / rowStep) + 2;
  const cells: { x: number; y: number; key: string }[] = [];

  for (let c = -1; c <= cols; c++) {
    for (let r = -1; r <= rows; r++) {
      const x = c * colStep;
      const y = r * rowStep + (c % 2 !== 0 ? rowStep / 2 : 0);
      cells.push({ x, y, key: `${c},${r}` });
    }
  }
  return cells;
}

/**
 * Snaps a spot's fractional (x, y) coordinates onto the nearest flat-topped cell center.
 */
export function placeSpot(key: string, stageW: number, stageH: number): { x: number; y: number; side: Spot['side'] } {
  const spot = SPOTS[key] || { x: 0.5, y: 0.5, side: 'below' };
  const top = 60;
  const bottom = 80;
  const rawX = spot.x * stageW;
  const rawY = top + spot.y * (stageH - top - bottom);

  // Snap to lattice coordinate
  const [q, r] = hexKey(rawX - stageW / 2, stageH / 2 - rawY).split(',').map(Number);
  const snappedX = stageW / 2 + HEX_R * 1.5 * q;
  const snappedY = stageH / 2 - HEX_R * Math.sqrt(3) * (r + q / 2);

  return {
    x: snappedX,
    y: snappedY,
    side: spot.side,
  };
}
