import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "kanjivg-svg:";
const memoryCache = new Map<string, string>();

export function getKanjiChars(str: string): string[] {
  return [...str].filter((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0x20000 && cp <= 0x2a6df)
    );
  });
}

export function charToHex(char: string): string {
  return (char.codePointAt(0) ?? 0).toString(16).padStart(5, "0");
}

export type ParsedKanjiVg = {
  paths: string[];
  numbers: { x: number; y: number; text: string }[];
};

/** Extract inner HTML of a <g> group by id fragment, handling nested groups. */
function extractGroupContent(svg: string, idFragment: string): string | null {
  const openRe = new RegExp(`<g[^>]*id="[^"]*${idFragment}[^"]*"[^>]*>`, "i");
  const openMatch = openRe.exec(svg);
  if (!openMatch || openMatch.index === undefined) return null;

  let pos = openMatch.index + openMatch[0].length;
  let depth = 1;

  while (pos < svg.length && depth > 0) {
    const nextOpen = svg.indexOf("<g", pos);
    const nextClose = svg.indexOf("</g>", pos);
    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 2;
      continue;
    }

    depth -= 1;
    if (depth === 0) return svg.slice(openMatch.index + openMatch[0].length, nextClose);
    pos = nextClose + 4;
  }

  return null;
}

function parseAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`, "i");
  return re.exec(tag)?.[1] ?? null;
}

function parseTextElement(
  tag: string,
  inner: string,
): { x: number; y: number; text: string } | null {
  const text = inner.trim();
  if (!text) return null;

  const xAttr = parseAttr(tag, "x");
  const yAttr = parseAttr(tag, "y");
  if (xAttr != null && yAttr != null) {
    return { x: parseFloat(xAttr), y: parseFloat(yAttr), text };
  }

  const transform = parseAttr(tag, "transform");
  if (transform) {
    const matrix = transform.match(
      /matrix\s*\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\)/i,
    );
    if (matrix) {
      return {
        x: parseFloat(matrix[5]!),
        y: parseFloat(matrix[6]!),
        text,
      };
    }

    const translate = transform.match(
      /translate\s*\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/i,
    );
    if (translate) {
      return {
        x: parseFloat(translate[1]!),
        y: parseFloat(translate[2] ?? "0"),
        text,
      };
    }
  }

  return null;
}

export function parseKanjiVgSvg(svg: string): ParsedKanjiVg {
  const paths: string[] = [];
  const numbers: { x: number; y: number; text: string }[] = [];

  const strokeContent = extractGroupContent(svg, "StrokePaths");
  if (strokeContent) {
    const pathRe = /<path\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = pathRe.exec(strokeContent)) !== null) {
      const d = parseAttr(m[0], "d");
      if (d) paths.push(d);
    }
  }

  const numContent = extractGroupContent(svg, "StrokeNumbers");
  if (numContent) {
    const textRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
    let m: RegExpExecArray | null;
    while ((m = textRe.exec(numContent)) !== null) {
      const parsed = parseTextElement(`<text${m[1]}>`, m[2] ?? "");
      if (parsed) numbers.push(parsed);
    }
  }

  return { paths, numbers };
}

export function cleanKanjiVgSvg(raw: string): string {
  return raw
    .replace(/<\?xml[\s\S]*?\?>/i, "")
    .replace(/<!DOCTYPE[\s\S]*?(?:\[[\s\S]*?\])?\s*>/i, "")
    .trim();
}

async function fetchKanjiVgSvgFromNetwork(char: string): Promise<string> {
  const hex = charToHex(char);
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("not found");
  return cleanKanjiVgSvg(await res.text());
}

/** Load KanjiVG SVG: memory → AsyncStorage → network (cached after fetch). */
export async function loadKanjiVgSvg(char: string): Promise<string> {
  const hex = charToHex(char);
  const cachedMem = memoryCache.get(hex);
  if (cachedMem) return cachedMem;

  try {
    const cachedDisk = await AsyncStorage.getItem(`${CACHE_PREFIX}${hex}`);
    if (cachedDisk) {
      memoryCache.set(hex, cachedDisk);
      return cachedDisk;
    }
  } catch {
    /* ignore storage errors */
  }

  const svg = await fetchKanjiVgSvgFromNetwork(char);
  memoryCache.set(hex, svg);
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${hex}`, svg);
  } catch {
    /* ignore storage errors */
  }
  return svg;
}

/** Rough path length for stroke-dash animation (109×109 KanjiVG viewBox). */
export function estimatePathLength(d: string): number {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  if (nums.length < 4) return 120;

  let len = 0;
  let px = nums[0]!;
  let py = nums[1]!;
  for (let i = 2; i + 1 < nums.length; i += 2) {
    const x = nums[i]!;
    const y = nums[i + 1]!;
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return Math.max(80, Math.ceil(len * 1.2));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Gradient stroke color from main400 → main600. */
export function strokeGradientColor(
  index: number,
  total: number,
  main400: string,
  main600: string,
): string {
  const t = total <= 1 ? 0 : index / (total - 1);
  const a = hexToRgb(main400);
  const b = hexToRgb(main600);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

export const STROKE_DELAY_MS = 320;
export const STROKE_DURATION_MS = 300;
