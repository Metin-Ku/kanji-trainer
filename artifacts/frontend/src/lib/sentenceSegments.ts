import type { Word } from "../types";

export type SentenceSegment =
  | { kind: "text"; text: string }
  | { kind: "hidden"; text: string }
  | { kind: "word"; text: string; word: Word };

export function buildKanjiIndex(words: Word[]): Map<string, Word> {
  const map = new Map<string, Word>();
  for (const w of words) {
    const k = w.kanji?.trim();
    if (k && !map.has(k)) map.set(k, w);
  }
  return map;
}

/** Longest-match segmentation of known kanji entries in a sentence. */
export function segmentSentence(
  sentence: string,
  hiddenWord: string,
  kanjiIndex: Map<string, Word>,
): SentenceSegment[] {
  if (!sentence) return [];

  const keys = [...kanjiIndex.keys()].sort((a, b) => b.length - a.length);
  const segments: SentenceSegment[] = [];
  let i = 0;

  while (i < sentence.length) {
    if (hiddenWord && sentence.startsWith(hiddenWord, i)) {
      segments.push({ kind: "hidden", text: hiddenWord });
      i += hiddenWord.length;
      continue;
    }

    let matched = false;
    for (const key of keys) {
      if (key === hiddenWord) continue;
      if (sentence.startsWith(key, i)) {
        segments.push({ kind: "word", text: key, word: kanjiIndex.get(key)! });
        i += key.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const start = i;
      i += 1;
      while (i < sentence.length) {
        if (hiddenWord && sentence.startsWith(hiddenWord, i)) break;
        let hit = false;
        for (const key of keys) {
          if (key !== hiddenWord && sentence.startsWith(key, i)) {
            hit = true;
            break;
          }
        }
        if (hit) break;
        i += 1;
      }
      segments.push({ kind: "text", text: sentence.slice(start, i) });
    }
  }

  return mergeTextSegments(segments);
}

function mergeTextSegments(segs: SentenceSegment[]): SentenceSegment[] {
  const out: SentenceSegment[] = [];
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (s.kind === "text" && prev?.kind === "text") {
      prev.text += s.text;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}
