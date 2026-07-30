import type { LinkedToken, SrsExample, Word } from "./types";
import {
  isJapaneseAnalyzerAvailable,
  tokenizeJapanese,
} from "./japaneseAnalyzer";

export function buildLemmaIndex(
  words: Word[],
  excludeWordId?: number,
): Map<string, Word> {
  const map = new Map<string, Word>();
  for (const w of words) {
    if (excludeWordId != null && w.id === excludeWordId) continue;
    const k = w.kanji?.trim();
    if (!k || map.has(k)) continue;
    map.set(k, w);
  }
  return map;
}

function overlapsHidden(
  start: number,
  end: number,
  hidden: [number, number] | null,
): boolean {
  if (!hidden) return false;
  return start < hidden[1] && end > hidden[0];
}

function hiddenRange(sentence: string, hiddenWord?: string): [number, number] | null {
  if (!hiddenWord) return null;
  const start = sentence.indexOf(hiddenWord);
  if (start < 0) return null;
  return [start, start + hiddenWord.length];
}

function isInflectable(pos?: string): boolean {
  return pos === "動詞" || pos === "形容詞";
}

function shouldMergeTail(prevPos?: string, nextPos?: string, nextSurface?: string): boolean {
  if (nextPos === "助動詞") return true;
  if (nextPos === "助詞" && (nextSurface === "て" || nextSurface === "で")) {
    return isInflectable(prevPos);
  }
  if (prevPos === "助動詞" && nextPos === "助動詞") return true;
  return false;
}

function expandConjugationEnd(
  tokens: { pos?: string; start: number; end: number; surface_form?: string }[],
  startIndex: number,
): number {
  if (!isInflectable(tokens[startIndex]?.pos)) return startIndex;
  let j = startIndex;
  while (j + 1 < tokens.length) {
    if (
      !shouldMergeTail(
        tokens[j]?.pos,
        tokens[j + 1]?.pos,
        tokens[j + 1]?.surface_form,
      )
    ) {
      break;
    }
    j++;
  }
  return j;
}

function linkExampleSentenceBySubstring(
  sentence: string,
  words: Word[],
  options?: {
    hiddenWord?: string;
    excludeWordId?: number;
  },
): LinkedToken[] {
  const text = sentence;
  if (!text || words.length === 0) return [];

  const hidden = options?.hiddenWord
    ? hiddenRange(text, options.hiddenWord)
    : null;

  const kanjiList = words
    .filter((w) => options?.excludeWordId == null || w.id !== options.excludeWordId)
    .map((w) => w.kanji.trim())
    .filter((k) => k.length > 0 && text.includes(k))
    .sort((a, b) => b.length - a.length);

  const links: LinkedToken[] = [];
  const usedRanges: [number, number][] = [];

  for (const kanji of kanjiList) {
    const word = words.find(
      (w) =>
        w.kanji.trim() === kanji &&
        (options?.excludeWordId == null || w.id !== options.excludeWordId),
    );
    if (!word) continue;

    let searchFrom = 0;
    while (searchFrom < text.length) {
      const start = text.indexOf(kanji, searchFrom);
      if (start < 0) break;
      const end = start + kanji.length;

      if (
        overlapsHidden(start, end, hidden) ||
        usedRanges.some(([s, e]) => start < e && end > s)
      ) {
        searchFrom = start + 1;
        continue;
      }

      links.push({
        start,
        end,
        surface: kanji,
        wordId: word.id,
        lemma: kanji,
      });
      usedRanges.push([start, end]);
      searchFrom = end;
    }
  }

  return links.sort((a, b) => a.start - b.start);
}

async function linkExampleSentenceWithAnalyzer(
  sentence: string,
  words: Word[],
  options?: {
    hiddenWord?: string;
    excludeWordId?: number;
  },
): Promise<LinkedToken[]> {
  const text = sentence;
  const tokens = await tokenizeJapanese(text);
  const index = buildLemmaIndex(words, options?.excludeWordId);
  const hidden = options?.hiddenWord
    ? hiddenRange(text, options.hiddenWord)
    : null;

  const links: LinkedToken[] = [];
  const usedRanges: [number, number][] = [];
  const used = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    if (used.has(i)) continue;
    const t = tokens[i]!;
    if (overlapsHidden(t.start, t.end, hidden)) continue;

    const lemma = t.basic_form;
    const word = index.get(lemma);
    if (!word) continue;

    const expandTo = expandConjugationEnd(tokens, i);
    const spanStart = t.start;
    const spanEnd = tokens[expandTo]!.end;
    const surface = text.slice(spanStart, spanEnd);

    if (overlapsHidden(spanStart, spanEnd, hidden)) continue;
    if (usedRanges.some(([s, e]) => spanStart < e && spanEnd > s)) continue;

    for (let k = i; k <= expandTo; k++) used.add(k);

    links.push({
      start: spanStart,
      end: spanEnd,
      surface,
      wordId: word.id,
      lemma,
    });
    usedRanges.push([spanStart, spanEnd]);
  }

  return links;
}

export async function linkExampleSentence(
  sentence: string,
  words: Word[],
  options?: {
    hiddenWord?: string;
    excludeWordId?: number;
  },
): Promise<LinkedToken[]> {
  const text = sentence;
  if (!text || words.length === 0) return [];

  if (isJapaneseAnalyzerAvailable()) {
    try {
      return await linkExampleSentenceWithAnalyzer(text, words, options);
    } catch {
      // fall back to substring matching
    }
  }

  return linkExampleSentenceBySubstring(text, words, options);
}

export async function linkSrsExamples(
  examples: SrsExample[],
  words: Word[],
  excludeWordId?: number,
): Promise<SrsExample[]> {
  const out: SrsExample[] = [];
  for (const ex of examples) {
    if (!ex.sentence.trim()) {
      out.push(ex);
      continue;
    }
    const linkedTokens = await linkExampleSentence(ex.sentence, words, {
      hiddenWord: ex.hiddenWord,
      excludeWordId,
    });
    out.push({ ...ex, linkedTokens });
  }
  return out;
}

export async function relinkAllWordsSrsExamples(
  words: Word[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ wordId: number; srsExamples: SrsExample[]; usedFallback: boolean }[]> {
  const toUpdate = words.filter((w) =>
    w.srsExamples?.some((ex) => ex.sentence.trim()),
  );
  const total = toUpdate.length;
  const results: { wordId: number; srsExamples: SrsExample[]; usedFallback: boolean }[] = [];
  const usedFallback = !isJapaneseAnalyzerAvailable();

  for (let i = 0; i < toUpdate.length; i++) {
    const word = toUpdate[i]!;
    const linked = await linkSrsExamples(word.srsExamples, words, word.id);
    results.push({ wordId: word.id, srsExamples: linked, usedFallback });
    onProgress?.(i + 1, total);
  }

  return results;
}
