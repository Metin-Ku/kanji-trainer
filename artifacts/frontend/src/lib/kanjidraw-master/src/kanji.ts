export type KanjiStroke = { x: number; y: number };

export type KanjiLines = KanjiStroke[];

export interface MatchOptions {
  fuzzy?: boolean;
  offby1?: boolean;
  maxResults?: number;
  cutoff?: number;
}

type KanjiLine = [number, number, number, number];
type MatchResult = [number, string];
type LocationPoint = readonly [number, number];
type KanjiData = Record<number, Record<string, KanjiLine[]>>;

const DIRECTION_THRESHOLD = 51;
const DIAGONAL_THRESHOLD = 77;
const STROKE_DIRECTION_WEIGHT = 1.0;
const MOVE_DIRECTION_WEIGHT = 0.8;
const STROKE_LOCATION_WEIGHT = 0.6;
const CLOSE_WEIGHT = 0.7;
const MAX_RESULTS = 25;
const CUTOFF = 0.75;

import dataJson from './data.json';
const data = dataJson as unknown as KanjiData;

export function matches(strokes: KanjiLines[], options: MatchOptions = {}): MatchResult[] {
  const { fuzzy = false, offby1 = false, maxResults = MAX_RESULTS, cutoff = CUTOFF } = options;
  if (strokes.length === 0) return [];

  const normalized = normalizeStrokes(strokes).map(line => [...line] as KanjiLine);
  const lines = new Kanji(normalized, fuzzy);
  const matchFn = offby1
    ? fuzzy ? fuzzyMatchOffby1 : strictMatchOffby1
    : fuzzy ? fuzzyMatch : strictMatch;
  const dataItems = offby1 ? dataItemsOffby1 : dataItemsByLength;
  const candidates = dataItems(lines, data);

  const scored: MatchResult[] = Array.from(candidates, ([kanji, path]) => {
    const pathLines = Array.isArray(path)
      ? path.map(line => [...line] as KanjiLine)
      : Array.from(path as Iterable<KanjiLine>, line => [...line] as KanjiLine);
    return [matchFn(lines, new Kanji(pathLines, fuzzy)), kanji] as MatchResult;
  }).sort((a, b) => b[0] - a[0]);

  if (scored.length === 0) return [];
  const minScore = scored[0][0] * cutoff;
  return scored.filter(([score]) => score >= minScore).slice(0, maxResults);
}

function normalizeStrokes(strokes: KanjiLines[]) {
  return strokes
    .map(stroke => {
      const mapped = stroke.map(({ x, y }) => ({ x: Math.round((x * 255) / 400), y: Math.round((y * 255) / 400) }));
      if (mapped.length < 2) return null;
      const first = mapped[0];
      const last = mapped[mapped.length - 1];
      return [first.x, first.y, last.x, last.y] as const;
    })
    .filter((stroke): stroke is KanjiLine => stroke !== null);
}

class Kanji extends Array<KanjiLine> {
  private _fuzzy?: Kanji;
  private _starts?: readonly LocationPoint[];
  private _ends?: readonly LocationPoint[];
  private _dirs?: readonly number[];
  private _moves?: readonly number[];

  constructor(lines: Iterable<KanjiLine>, fuzzy = false) {
    const list = Array.from(lines);
    super(...list);
    Object.setPrototypeOf(this, Kanji.prototype);
    if (fuzzy) {
      this._fuzzy = new Kanji(_fuzzySort(list), true);
    }
  }

  get fuzzy(): Kanji {
    if (!this._fuzzy) {
      this._fuzzy = new Kanji(_fuzzySort(this as any), true);
    }
    return this._fuzzy;
  }

  get starts(): readonly LocationPoint[] {
    if (!this._starts) {
      this._starts = this.map(line => Location.ofPoint(line[0], line[1])) as readonly LocationPoint[];
    }
    return this._starts;
  }

  get ends(): readonly LocationPoint[] {
    if (!this._ends) {
      this._ends = this.map(line => Location.ofPoint(line[2], line[3])) as readonly LocationPoint[];
    }
    return this._ends;
  }

  get dirs() {
    if (!this._dirs) {
      this._dirs = this.map(line => Direction.ofLine(line));
    }
    return this._dirs;
  }

  get moves() {
    if (!this._moves) {
      this._moves = this.slice(1).map((line, i) => Direction.ofMove(this[i] as any, line));
    }
    return this._moves;
  }

  minus1Stroke() {
    const results: Kanji[] = [];
    for (let i = 0; i < this.length; i += 1) {
      const copy = this.slice(0, i).concat(this.slice(i + 1)) as Array<[number, number, number, number]>;
      results.push(new Kanji(copy, !!this._fuzzy));
    }
    return results;
  }
}

class Direction {
  static X = 0;
  static N = 1;
  static NE = 2;
  static E = 3;
  static SE = 4;
  static S = 5;
  static SW = 6;
  static W = 7;
  static NW = 8;

  static ofLine(line: [number, number, number, number]) {
    const [x1, y1, x2, y2] = line;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx < DIRECTION_THRESHOLD && ady < DIRECTION_THRESHOLD) return Direction.X;
    if (adx > ady) {
      const diag = ady > (DIAGONAL_THRESHOLD * adx) / 256;
      if (dx > 0) return dy < 0 ? (diag ? Direction.NE : Direction.E) : (diag ? Direction.SE : Direction.E);
      return dy < 0 ? (diag ? Direction.NW : Direction.W) : (diag ? Direction.SW : Direction.W);
    }
    const diag = adx > (DIAGONAL_THRESHOLD * ady) / 256;
    if (dy > 0) return dx < 0 ? (diag ? Direction.SW : Direction.S) : (diag ? Direction.SE : Direction.S);
    return dx < 0 ? (diag ? Direction.NW : Direction.N) : (diag ? Direction.NE : Direction.N);
  }

  static ofMove(l1: [number, number, number, number], l2: [number, number, number, number]) {
    return Direction.ofLine([l1[2], l1[3], l2[0], l2[1]]);
  }

  static isClose(a: number, b: number) {
    return a === Direction.X || b === Direction.X || a === b || a === ((b + 1) % 8) || ((a + 1) % 8) === b;
  }
}

class Location {
  static N = [1, 0] as const;
  static NE = [2, 0] as const;
  static E = [2, 1] as const;
  static SE = [2, 2] as const;
  static S = [1, 2] as const;
  static SW = [0, 2] as const;
  static W = [0, 1] as const;
  static NW = [0, 0] as const;
  static MID = [1, 1] as const;

  static ofPoint(x: number, y: number) {
    if (x < 85) {
      return y < 85 ? Location.NW : y < 170 ? Location.W : Location.SW;
    }
    if (x < 170) {
      return y < 85 ? Location.N : y < 170 ? Location.MID : Location.S;
    }
    return y < 85 ? Location.NE : y < 170 ? Location.E : Location.SE;
  }

  static isClose(a: readonly [number, number], b: readonly [number, number]) {
    return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
  }
}

function _fuzzySort(lines: Array<[number, number, number, number]>) {
  const result = lines.map(line => {
    const start = Location.ofPoint(line[0], line[1]);
    const end = Location.ofPoint(line[2], line[3]);
    const pair = [start[0], start[1], end[0], end[1], line[0], line[1], line[2], line[3]] as const;
    return { start, end, coords: line };
  });
  result.sort((a, b) => {
    if (a.start[0] !== b.start[0]) return a.start[0] - b.start[0];
    if (a.start[1] !== b.start[1]) return a.start[1] - b.start[1];
    if (a.end[0] !== b.end[0]) return a.end[0] - b.end[0];
    if (a.end[1] !== b.end[1]) return a.end[1] - b.end[1];
    return 0;
  });
  return result.map(r => r.coords);
}

function pointsEqual(a: readonly [number, number], b: readonly [number, number]) {
  return a[0] === b[0] && a[1] === b[1];
}

function strictMatch(a: Kanji, b: Kanji) {
  if (a.length !== b.length) throw new Error('must have same length');
  let score = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a.dirs[i] === b.dirs[i]) score += STROKE_DIRECTION_WEIGHT;
    else if (Direction.isClose(a.dirs[i], b.dirs[i])) score += STROKE_DIRECTION_WEIGHT * CLOSE_WEIGHT;
    if (i > 0) {
      if (a.moves[i - 1] === b.moves[i - 1]) score += MOVE_DIRECTION_WEIGHT;
      else if (Direction.isClose(a.moves[i - 1], b.moves[i - 1])) score += MOVE_DIRECTION_WEIGHT * CLOSE_WEIGHT;
    }
    if (pointsEqual(a.starts[i], b.starts[i])) score += STROKE_LOCATION_WEIGHT;
    else if (Location.isClose(a.starts[i], b.starts[i])) score += STROKE_LOCATION_WEIGHT * CLOSE_WEIGHT;
    if (pointsEqual(a.ends[i], b.ends[i])) score += STROKE_LOCATION_WEIGHT;
    else if (Location.isClose(a.ends[i], b.ends[i])) score += STROKE_LOCATION_WEIGHT * CLOSE_WEIGHT;
  }
  const m = a.length * (STROKE_DIRECTION_WEIGHT + 2 * STROKE_LOCATION_WEIGHT) + (a.length - 1) * MOVE_DIRECTION_WEIGHT;
  return (100 * score) / m;
}

function fuzzyMatch(a: Kanji, b: Kanji) {
  return strictMatch(a.fuzzy, b.fuzzy);
}

function strictMatchOffby1(a: Kanji, b: Kanji) {
  return matchOffby1(a, b, strictMatch);
}

function fuzzyMatchOffby1(a: Kanji, b: Kanji) {
  return matchOffby1(a.fuzzy, b.fuzzy, strictMatch);
}

function matchOffby1(a: Kanji, b: Kanji, match: (a: Kanji, b: Kanji) => number) {
  if (Math.abs(a.length - b.length) !== 1) throw new Error('length difference must be 1');
  const small = a.length < b.length ? a : b;
  const large = a.length < b.length ? b : a;
  return Math.max(...large.minus1Stroke().map(c => match(small, c)));
}

function dataItemsByLength(lines: Kanji, dataSource: typeof data) {
  return Object.entries(dataSource[lines.length] ?? {});
}

function dataItemsOffby1(lines: Kanji, dataSource: typeof data) {
  const items: Array<[string, Array<[number, number, number, number]>]> = [];
  for (const n of [lines.length - 1, lines.length + 1]) {
    if (dataSource[n]) {
      items.push(...Object.entries(dataSource[n]));
    }
  }
  return items;
}
