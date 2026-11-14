import { Stop } from '../types/warmpath';
import { placeSpot, SPOTS } from './hexMath';

export const TOTAL_STRANDS = 14;

/**
 * Fast deterministic PRNG (mulberry32).
 */
export function mulberry(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deals out 14 strands to match each stop's achiever count.
 */
export function dealStrands(stops: Stop[]): number[][] {
  const rand = mulberry(11);
  const strands: number[][] = Array.from({ length: TOTAL_STRANDS }, () => []);

  stops.forEach((stop) => {
    const order = Array.from({ length: TOTAL_STRANDS }, (_, i) => i).sort(() => rand() - 0.5);
    order.slice(0, stop.achievers).forEach((i) => strands[i].push(stop.activity_id));
  });

  return strands;
}

export interface StrandPath {
  id: number;
  d: string;
  activityIds: number[];
}

/**
 * Generates cubic-bezier SVG path data for each of the 14 thermal routes across the stage.
 */
export function generateStrandPaths(stops: Stop[], stageW: number, stageH: number): StrandPath[] {
  const strands = dealStrands(stops);
  const rand = mulberry(29);

  const you = placeSpot('you', stageW, stageH);
  const goal = placeSpot('goal', stageW, stageH);

  const order = [...stops].sort((a, b) => {
    const spotA = SPOTS[String(a.activity_id)]?.x || 0;
    const spotB = SPOTS[String(b.activity_id)]?.x || 0;
    return spotA - spotB;
  });

  return strands.map((ids, strandIdx) => {
    const pts: { x: number; y: number }[] = [
      { x: you.x, y: you.y + (rand() - 0.5) * 8 },
    ];

    order
      .filter((s) => ids.includes(s.activity_id))
      .forEach((s) => {
        const p = placeSpot(String(s.activity_id), stageW, stageH);
        const spread = 2 + s.achievers * 1.2;
        pts.push({
          x: p.x + (rand() - 0.5) * 6,
          y: p.y + (rand() - 0.5) * spread,
        });
      });

    pts.push({ x: goal.x, y: goal.y + (rand() - 0.5) * 10 });

    // Build SVG cubic bezier path
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const reach = (b.x - a.x) * 0.5;
      const cp1x = a.x + reach;
      const cp1y = a.y;
      const cp2x = b.x - reach;
      const cp2y = b.y;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }

    return {
      id: strandIdx,
      d,
      activityIds: ids,
    };
  });
}
