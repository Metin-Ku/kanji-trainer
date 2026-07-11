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
