export type HiddenScript = "kanji" | "hiragana" | "katakana";

const HAN_RE = /\p{Script=Han}/u;

export function hasKanji(str: string): boolean {
  return HAN_RE.test(str);
}

export function inferHiddenScript(text: string): HiddenScript {
  const t = text.trim();
  if (!t) return "kanji";
  if (hasKanji(t)) return "kanji";
  if (/^[\p{Script=Hiragana}\sー・]+$/u.test(t)) return "hiragana";
  if (/^[\p{Script=Katakana}\sー・]+$/u.test(t)) return "katakana";
  return "kanji";
}
