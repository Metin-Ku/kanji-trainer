export interface Point {
  x: number;
  y: number;
}

const VIEW_SIZE = 109;
const DEFAULT_TOLERANCE = 28;

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
  if (len >= 0.5) {
    const pts: Point[] = [];
    for (let i = 0; i < count; i++) {
      const pt = path.getPointAtLength((i / (count - 1)) * len);
      pts.push({ x: pt.x, y: pt.y });
    }
    return pts;
  }

  const d = path.getAttribute("d");
  if (!d) return [];
  return parsePathDataFallback(d);
}

/** Fallback when getTotalLength() is 0 (hidden SVG quirks). */
export function parsePathDataFallback(d: string): Point[] {
  const points: Point[] = [];

  const moveRe = /M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = moveRe.exec(d)) !== null) {
    points.push({ x: Number(m[1]), y: Number(m[2]) });
  }

  const lineRe = /L\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/gi;
  while ((m = lineRe.exec(d)) !== null) {
    points.push({ x: Number(m[1]), y: Number(m[2]) });
  }

  if (points.length < 2) {
    const nums = d.match(/-?[\d.]+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
    if (nums.length >= 4) {
      return [
        { x: nums[0], y: nums[1] },
        { x: nums[nums.length - 2], y: nums[nums.length - 1] },
      ];
    }
    return [];
  }

  const dense: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    for (let s = 0; s < 8; s++) {
      const t = s / 8;
      dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  dense.push(points[points.length - 1]);
  return dense;
}

function averagePointDistance(a: Point[], b: Point[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += dist(a[i], b[i]);
  return sum / n;
}

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

/** Lenient check for simple strokes like 一 (horizontal/vertical line). */
function validateStraightStroke(
  userPoints: Point[],
  refPoints: Point[],
  tolerance: number,
): boolean {
  const ref = resamplePolyline(refPoints, 12);
  const user = resamplePolyline(userPoints, 12);
  const refStart = ref[0];
  const refEnd = ref[ref.length - 1];
  const userStart = user[0];
  const userEnd = user[user.length - 1];

  const refLen = dist(refStart, refEnd);
  const userLen = dist(userStart, userEnd);
  if (refLen < 2 || userLen < 2) return false;

  const lenRatio = userLen / refLen;
  if (lenRatio < 0.4 || lenRatio > 2.5) return false;

  const refAngle = Math.atan2(refEnd.y - refStart.y, refEnd.x - refStart.x);
  const userAngle = Math.atan2(userEnd.y - userStart.y, userEnd.x - userStart.x);
  const diff = angleDiff(refAngle, userAngle);
  if (diff > 0.65 && angleDiff(diff, Math.PI) > 0.65) return false;

  const refMid = {
    x: (refStart.x + refEnd.x) / 2,
    y: (refStart.y + refEnd.y) / 2,
  };
  const userMid = {
    x: (userStart.x + userEnd.x) / 2,
    y: (userStart.y + userEnd.y) / 2,
  };
  return dist(refMid, userMid) <= tolerance;
}

function scoreStroke(userPoints: Point[], refPoints: Point[], tolerance: number): boolean {
  if (userPoints.length < 2 || refPoints.length < 2) return false;

  const samples = 20;
  const ref = resamplePolyline(refPoints, samples);
  const userFwd = resamplePolyline(userPoints, samples);
  const userRev = [...userFwd].reverse();

  const loose = tolerance * 1.75;
  const veryLoose = tolerance * 2.4;

  for (const user of [userFwd, userRev]) {
    const avg = averagePointDistance(user, ref);
    if (avg <= loose) return true;

    const startNear = dist(user[0], ref[0]) <= tolerance;
    const endNear = dist(user[user.length - 1], ref[ref.length - 1]) <= tolerance;
    if (startNear && endNear && avg <= veryLoose) return true;
  }

  return (
    validateStraightStroke(userPoints, refPoints, tolerance * 1.6) ||
    validateStraightStroke(userPoints, [...refPoints].reverse(), tolerance * 1.6)
  );
}

/** Map client coordinates to viewBox space. */
export function clientToViewBox(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewWidth = VIEW_SIZE,
  viewHeight = VIEW_SIZE,
): Point {
  const x = ((clientX - rect.left) / rect.width) * viewWidth;
  const y = ((clientY - rect.top) / rect.height) * viewHeight;
  return { x, y };
}

export function validateStroke(
  userPoints: Point[],
  refPoints: Point[],
  tolerance = DEFAULT_TOLERANCE,
): boolean {
  if (refPoints.length < 2) return false;
  return scoreStroke(userPoints, refPoints, tolerance);
}
