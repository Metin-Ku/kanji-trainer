import type { Word } from "../types";

export function filterWords(words: Word[], query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return words;
  return words.filter(
    (w) =>
      w.kanji.toLowerCase().includes(q) ||
      w.pronunciation.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q),
  );
}

export function filterByJlptLevels(
  words: Word[],
  selectedJlpt: Set<string>,
): Word[] {
  if (selectedJlpt.size === 0) return words;
  return words.filter(
    (w) => w.jlptLevel && selectedJlpt.has(w.jlptLevel),
  );
}
