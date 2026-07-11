export interface Point {
  x: number;
  y: number;
}

const VIEW_SIZE = 109;
const DEFAULT_TOLERANCE = 20;

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function resamplePolyline(points: Point[], count: number): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: count }, () => points[0]);

  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = dist(points[i - 1], points[i]);
    segLens.push(d);
    total += d;
  }
  if (total < 1) return Array.from({ length: count }, () => points[0]);

  const result: Point[] = [];
  let seg = 0;
  let segPos = 0;

  for (let i = 0; i < count; i++) {
    const target = (i / (count - 1)) * total;
    while (seg < segLens.length - 1 && segPos + segLens[seg] < target) {
      segPos += segLens[seg];
      seg++;
    }
    const segLen = segLens[seg] || 1;
    const t = (target - segPos) / segLen;
    const a = points[seg];
    const b = points[Math.min(seg + 1, points.length - 1)];
    result.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });
  }
  return result;
}

export function sampleSvgPath(path: SVGPathElement, count: number): Point[] {
  const len = path.getTotalLength();
  if (len === 0) return [];
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    const pt = path.getPointAtLength((i / (count - 1)) * len);
    pts.push({ x: pt.x, y: pt.y });
  }
  return pts;
}

function averagePointDistance(a: Point[], b: Point[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += dist(a[i], b[i]);
  return sum / n;
}

function scoreStroke(userPoints: Point[], refPoints: Point[], tolerance: number): boolean {
  if (userPoints.length < 2) return false;

  const samples = 16;
  const user = resamplePolyline(userPoints, samples);
  const ref = refPoints.length >= 2 ? refPoints : refPoints;

  const userFwd = user;
  const userRev = [...user].reverse();

  const refStart = ref[0];
  const refEnd = ref[ref.length - 1];

  const checkOrientation = (oriented: Point[]) => {
    const startOk = dist(oriented[0], refStart) <= tolerance;
    const endOk = dist(oriented[oriented.length - 1], refEnd) <= tolerance;
    if (!startOk || !endOk) return false;
    return averagePointDistance(oriented, ref) <= tolerance * 1.35;
  };

  return checkOrientation(userFwd) || checkOrientation(userRev);
}

/** Map client coordinates to KanjiVG viewBox (0–109). */
export function clientToViewBox(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): Point {
  const x = ((clientX - rect.left) / rect.width) * VIEW_SIZE;
  const y = ((clientY - rect.top) / rect.height) * VIEW_SIZE;
  return { x, y };
}

export function validateStroke(
  userPoints: Point[],
  refPath: SVGPathElement,
  tolerance = DEFAULT_TOLERANCE,
): boolean {
  const refPoints = sampleSvgPath(refPath, 16);
  if (refPoints.length < 2) return false;
  return scoreStroke(userPoints, refPoints, tolerance);
}
