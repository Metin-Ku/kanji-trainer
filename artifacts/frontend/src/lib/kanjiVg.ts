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

export function cleanKanjiSvg(text: string): string {
  return text
    .replace(/<\?xml[\s\S]*?\?>/i, "")
    .replace(/<!DOCTYPE[\s\S]*?(?:\[[\s\S]*?\])?\s*>/i, "")
    .trim();
}

export async function fetchKanjiSvg(char: string): Promise<string> {
  const hex = charToHex(char);
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("not found");
  const text = await r.text();
  return cleanKanjiSvg(text);
}

const CHAR_VIEW = 109;

/** Combine per-character KanjiVG SVGs side-by-side for whole-word practice. */
export function buildCombinedStrokeSvg(charSvgs: string[]): string {
  const groups = charSvgs
    .map((svg, i) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");
      const strokeGroup = doc.querySelector('[id*="StrokePaths"]');
      if (!strokeGroup) return "";
      const paths = Array.from(strokeGroup.querySelectorAll("path"))
        .map((p) => {
          const d = p.getAttribute("d");
          return d ? `<path d="${d}" />` : "";
        })
        .join("");
      return `<g transform="translate(${i * CHAR_VIEW}, 0)">${paths}</g>`;
    })
    .join("");

  const w = CHAR_VIEW * charSvgs.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${CHAR_VIEW}">${groups}</svg>`;
}

export const KANJI_CHAR_VIEW = CHAR_VIEW;
