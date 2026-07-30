/** React Native only accepts hex/rgb — Tailwind v4 uses oklch. */

function parseOklch(input: string): { l: number; c: number; h: number } | null {
  const match = input.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)/i,
  );
  if (!match) return null;
  let l = parseFloat(match[1]!);
  if (match[2] === "%" || l > 1) l /= 100;
  return {
    l,
    c: parseFloat(match[3]!),
    h: parseFloat(match[4]!),
  };
}

function linearToSrgb(channel: number): number {
  const c = Math.min(Math.max(channel, 0), 1);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const r = linearToSrgb(
    +4.0767416621 * l_ ** 3 - 3.3077115913 * m_ ** 3 + 0.2309699292 * s_ ** 3,
  );
  const g = linearToSrgb(
    -1.2684380046 * l_ ** 3 + 2.6097574011 * m_ ** 3 - 0.3413193965 * s_ ** 3,
  );
  const bVal = linearToSrgb(
    -0.0041960863 * l_ ** 3 - 0.7034186147 * m_ ** 3 + 1.707614701 * s_ ** 3,
  );

  const byte = (x: number) =>
    Math.round(Math.min(Math.max(x, 0), 1) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${byte(r)}${byte(g)}${byte(bVal)}`;
}

export function toReactNativeColor(input: string): string {
  if (input.startsWith("#")) return input;
  if (input.startsWith("rgb")) return input;

  const oklch = parseOklch(input);
  if (oklch) return oklchToHex(oklch.l, oklch.c, oklch.h);

  return input;
}
