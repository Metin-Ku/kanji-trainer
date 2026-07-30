import type { Word } from "./types";

export function getRelatedWords(word: Word, allWords: Word[]): Word[] {
  if (!word.meaning) return [];

  const tokens = word.meaning
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);

  if (tokens.length === 0) return [];

  const seen = new Set<number>();
  const results: Word[] = [];

  for (const w of allWords) {
    if (w.id === word.id || seen.has(w.id) || !w.meaning) continue;

    const targetWords = w.meaning
      .split(/[,|\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length >= 4);

    const matched = tokens.some((token) => {
      const t = token.toLowerCase();
      return targetWords.some((tw) => tw.startsWith(t) || t.startsWith(tw));
    });

    if (matched) {
      seen.add(w.id);
      results.push(w);
    }
  }
  return results;
}
