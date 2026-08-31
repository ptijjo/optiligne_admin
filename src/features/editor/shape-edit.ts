import type { LineString } from '@/features/editor/schemas';

const SNAP_DEG = 0.0002;
const GRAB_DEG = 0.0012;

export type PinResult = {
  shape: LineString;
  index: number;
  inserted: boolean;
};

function copyCoords(shape: LineString): number[][] {
  return shape.coordinates.map((pt) => [...pt]);
}

function dist2(lng: number, lat: number, pt: number[]): number {
  const dx = lng - pt[0];
  const dy = lat - pt[1];
  return dx * dx + dy * dy;
}

function projectOnSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  lng: number,
  lat: number,
): { t: number; d2: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((lng - ax) * abx + (lat - ay) * aby) / len2));
  const px = ax + t * abx;
  const py = ay + t * aby;
  return { t, d2: dist2(lng, lat, [px, py]) };
}

export function moveVertex(shape: LineString, index: number, lat: number, lng: number): LineString {
  if (index < 0 || index >= shape.coordinates.length) {
    return shape;
  }
  const coordinates = copyCoords(shape);
  coordinates[index] = [lng, lat];
  return { type: 'LineString', coordinates };
}

export function removeVertex(shape: LineString, index: number): LineString {
  if (shape.coordinates.length <= 2) {
    return shape;
  }
  if (index <= 0 || index >= shape.coordinates.length - 1) {
    return shape;
  }
  const coordinates = copyCoords(shape);
  coordinates.splice(index, 1);
  return { type: 'LineString', coordinates };
}

export function shiftPinnedAfterInsert(pinned: number[], insertedAt: number): number[] {
  const next = pinned.map((i) => (i >= insertedAt ? i + 1 : i));
  if (!next.includes(insertedAt)) {
    next.push(insertedAt);
  }
  return next.sort((a, b) => a - b);
}

export function shiftPinnedAfterRemove(pinned: number[], removedAt: number): number[] {
  return pinned.filter((i) => i !== removedAt).map((i) => (i > removedAt ? i - 1 : i));
}

export function closestVertexIndex(shape: LineString, lat: number, lng: number): number {
  const pts = shape.coordinates;
  if (pts.length === 0) {
    return 0;
  }
  let best = 0;
  let bestD = dist2(lng, lat, pts[0]);
  for (let i = 1; i < pts.length; i += 1) {
    const d = dist2(lng, lat, pts[i]);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

export function isNearShape(shape: LineString, lat: number, lng: number): boolean {
  const pts = shape.coordinates;
  const limit = GRAB_DEG * GRAB_DEG;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const { d2 } = projectOnSegment(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], lng, lat);
    if (d2 <= limit) {
      return true;
    }
  }
  return false;
}

/** Remplace le morceau de tracé entre le début et la fin du geste par le trait dessiné. */
export function replaceStroke(shape: LineString, strokeLngLat: number[][]): LineString {
  if (strokeLngLat.length < 2 || shape.coordinates.length < 2) {
    return shape;
  }
  const start = strokeLngLat[0];
  const end = strokeLngLat[strokeLngLat.length - 1];
  let from = closestVertexIndex(shape, start[1], start[0]);
  let to = closestVertexIndex(shape, end[1], end[0]);
  let stroke = strokeLngLat.map((pt) => [...pt]);
  if (from > to) {
    const tmp = from;
    from = to;
    to = tmp;
    stroke.reverse();
  }
  const head = shape.coordinates.slice(0, from + 1);
  const tail = shape.coordinates.slice(to);
  const coordinates = [...head, ...stroke, ...tail];
  if (coordinates.length < 2) {
    return shape;
  }
  return { type: 'LineString', coordinates };
}

/** ~8 m à la latitude lorraine : lisse le geste souris sans couper un rond-point. */
export const SIMPLIFY_DEG = 0.00008;

function rdp(points: number[][], epsilon2: number): number[][] {
  if (points.length <= 2) {
    return points.map((pt) => [...pt]);
  }
  const first = points[0];
  const last = points[points.length - 1];
  let maxD = -1;
  let maxI = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const { d2 } = projectOnSegment(first[0], first[1], last[0], last[1], points[i][0], points[i][1]);
    if (d2 > maxD) {
      maxD = d2;
      maxI = i;
    }
  }
  if (maxD > epsilon2) {
    const left = rdp(points.slice(0, maxI + 1), epsilon2);
    const right = rdp(points.slice(maxI), epsilon2);
    return [...left.slice(0, -1), ...right];
  }
  return [[...first], [...last]];
}

/** Réduit un tracé dentelé (geste ou OSRM dense) en segments droits. */
export function simplifyShape(shape: LineString, epsilonDeg = SIMPLIFY_DEG): LineString {
  const cleaned: number[][] = [];
  for (const pt of shape.coordinates) {
    const prev = cleaned[cleaned.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) {
      cleaned.push([...pt]);
    }
  }
  if (cleaned.length <= 2) {
    return { type: 'LineString', coordinates: cleaned.length >= 2 ? cleaned : shape.coordinates };
  }
  const coordinates = rdp(cleaned, epsilonDeg * epsilonDeg);
  if (coordinates.length < 2) {
    return shape;
  }
  return { type: 'LineString', coordinates };
}

/** Clique WGS84 : accroche un sommet existant ou insère un point sur le segment le plus proche. */
export function pinOrInsertVertex(shape: LineString, lat: number, lng: number): PinResult {
  const pts = shape.coordinates;
  if (pts.length < 2) {
    return { shape, index: 0, inserted: false };
  }

  let bestVertex = 0;
  let bestVertexD = dist2(lng, lat, pts[0]);
  for (let i = 1; i < pts.length; i += 1) {
    const d = dist2(lng, lat, pts[i]);
    if (d < bestVertexD) {
      bestVertex = i;
      bestVertexD = d;
    }
  }
  const snap2 = SNAP_DEG * SNAP_DEG;
  if (bestVertexD <= snap2) {
    return { shape, index: bestVertex, inserted: false };
  }

  let bestSeg = 0;
  let bestSegD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const { d2 } = projectOnSegment(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], lng, lat);
    if (d2 < bestSegD) {
      bestSeg = i;
      bestSegD = d2;
    }
  }
  const coordinates = copyCoords(shape);
  const insertAt = bestSeg + 1;
  coordinates.splice(insertAt, 0, [lng, lat]);
  return { shape: { type: 'LineString', coordinates }, index: insertAt, inserted: true };
}
