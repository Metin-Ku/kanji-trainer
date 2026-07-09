const HAN_RE = /\p{Script=Han}/u;
const HIRAGANA_RE = /\p{Script=Hiragana}/u;
const KATAKANA_RE = /\p{Script=Katakana}/u;
const LATIN_RE = /\p{Script=Latin}/u;

/** True when the string contains CJK unified ideographs (kanji). */
export function hasKanji(str: string): boolean {
  return HAN_RE.test(str);
}

export function hasHiragana(str: string): boolean {
  return HIRAGANA_RE.test(str);
}

export function hasKatakana(str: string): boolean {
  return KATAKANA_RE.test(str);
}

export function hasLatin(str: string): boolean {
  return LATIN_RE.test(str);
}

/**
 * Page header label sizing: Latin titles stay compact; kanji titles render slightly larger.
 */
export function pageTitleLabelClass(text: string): string {
  const size = hasKanji(text) ? "text-[14px]" : "text-[11px]";
  return `${size} font-semibold text-main-400 uppercase tracking-widest inline-flex items-center gap-1.5 min-w-0`;
}
