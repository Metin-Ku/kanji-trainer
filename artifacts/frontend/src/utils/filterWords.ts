import type { Word } from "../types";

export function filterWords(words: Word[], query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return words;
  return words.filter(
    (w) =>
      w.kanji.toLowerCase().includes(q) ||
      w.pronunciation.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q)
  );
}
