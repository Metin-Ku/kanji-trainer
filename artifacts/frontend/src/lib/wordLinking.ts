import kuromoji from "kuromoji";
import * as wanakana from "wanakana";
import type { LinkedToken, RubyPart, SrsExample, TargetChunk, Word } from "../types";
import {
  exampleDisplayText,
  extractReading,
  primaryHiddenRangeInExample,
  syncExampleFromSentence,
} from "./srsExamples";

// kuromoji ships without strict TS generics in this project
type KuromojiTokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
type KuromojiToken = kuromoji.IpadicFeatures;

function tokenStart(t: KuromojiToken): number {
  return t.word_position - 1;
}

function tokenEnd(t: KuromojiToken): number {
  return tokenStart(t) + t.surface_form.length;
}

function isInflectableLemmaToken(t: KuromojiToken): boolean {
  return t.pos === "動詞" || t.pos === "形容詞";
}

/** Extend a verb/adjective link through following auxiliaries (e.g. 学び+まし+た → 学びました). */
function shouldMergeConjugationTail(
  prev: KuromojiToken,
  next: KuromojiToken,
): boolean {
  if (next.pos === "助動詞") return true;

  if (next.pos === "助詞") {
    const s = next.surface_form;
    if (s === "て" || s === "で") return isInflectableLemmaToken(prev);
    if (s === "ん" && prev.pos === "助動詞") return true;
    return false;
  }

  if (
    prev.pos === "助詞" &&
    (prev.surface_form === "て" || prev.surface_form === "で")
  ) {
    return next.pos === "動詞" || next.pos === "助動詞";
  }

  if (prev.pos === "助動詞" && next.pos === "助動詞") return true;

  return false;
}

function expandConjugationEnd(
  tokens: KuromojiToken[],
  startIndex: number,
): number {
  if (!isInflectableLemmaToken(tokens[startIndex])) return startIndex;

  let j = startIndex;
  while (j + 1 < tokens.length) {
    if (!shouldMergeConjugationTail(tokens[j], tokens[j + 1])) break;
    j++;
  }
  return j;
}

function spanFromTokens(
  tokens: KuromojiToken[],
  from: number,
  to: number,
  text: string,
): { start: number; end: number; surface: string } {
  const start = tokenStart(tokens[from]);
  const end = tokenEnd(tokens[to]);
  return { start, end, surface: text.slice(start, end) };
}

let tokenizerPromise: Promise<KuromojiTokenizer> | null = null;

const DIC_PATH = (() => {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}kuromoji/dict/`;
})();

const KUROMOJI_LOAD_TIMEOUT_MS = 20_000;

function loadKuromojiTokenizer(): Promise<KuromojiTokenizer> {
  return new Promise((resolve, reject) => {
    try {
      kuromoji.builder({ dicPath: DIC_PATH }).build((err, tokenizer) => {
        if (err) {
          console.error("[kuromoji] dictionary load failed:", err, "dicPath:", DIC_PATH);
          reject(err);
        } else {
          resolve(tokenizer);
        }
      });
    } catch (err) {
      console.error("[kuromoji] builder threw:", err, "dicPath:", DIC_PATH);
      reject(err);
    }
  });
}

export function getKuromojiTokenizer(): Promise<KuromojiTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = Promise.race([
      loadKuromojiTokenizer(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Kuromoji dictionary load timed out (${KUROMOJI_LOAD_TIMEOUT_MS}ms) dicPath: ${DIC_PATH}`,
              ),
            ),
          KUROMOJI_LOAD_TIMEOUT_MS,
        );
      }),
    ]).catch((err) => {
      tokenizerPromise = null;
      throw err;
    });
  }
  return tokenizerPromise;
}

/** Lemma / surface → word lookup. */
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

export function buildWordsById(words: Word[]): Map<number, Word> {
  return new Map(words.map((w) => [w.id, w]));
}

const KANJI_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

function containsKanji(text: string): boolean {
  return KANJI_RE.test(text);
}

/** Kana reading only — strips romaji in parentheses, e.g. `がっこう (gakkou)` → `がっこう`. */
export function readingForWord(word: Word): string {
  return extractReading(word.pronunciation);
}

function kataToHira(katakana: string): string {
  return wanakana.toHiragana(katakana);
}

/** Split one kuromoji token surface into ruby parts (kanji stem + okurigana). */
function tokenSurfaceToRubyParts(
  surface: string,
  readingKatakana?: string,
): RubyPart[] {
  if (!surface) return [];
  if (!readingKatakana || !containsKanji(surface)) {
    return [{ base: surface }];
  }

  const reading = kataToHira(readingKatakana);
  let kanjiEnd = 0;
  for (let i = 0; i < surface.length; i++) {
    if (containsKanji(surface[i]!)) kanjiEnd = i + 1;
    else break;
  }

  const kanjiPart = surface.slice(0, kanjiEnd);
  const okurigana = surface.slice(kanjiEnd);

  if (!kanjiPart) return [{ base: surface }];
  if (!okurigana) return [{ base: kanjiPart, reading }];
  if (reading.endsWith(okurigana)) {
    return [
      {
        base: kanjiPart,
        reading: reading.slice(0, reading.length - okurigana.length),
      },
      { base: okurigana },
    ];
  }
  return [{ base: surface, reading }];
}

/** Build ruby parts for a linked surface using kuromoji readings. */
export function buildRubyPartsForSurface(
  surface: string,
  tokenizer: KuromojiTokenizer,
): RubyPart[] {
  if (!surface) return [{ base: surface }];
  const tokens = tokenizer.tokenize(surface);
  if (tokens.length === 0) return [{ base: surface }];

  const parts: RubyPart[] = [];
  let built = "";
  for (const t of tokens) {
    parts.push(...tokenSurfaceToRubyParts(t.surface_form, t.reading));
    built += t.surface_form;
  }
  if (built.length < surface.length) {
    parts.push({ base: surface.slice(built.length) });
  }
  return parts;
}

/** Sync fallback when persisted chunk.ruby is unavailable (dictionary form only). */
export function rubyPartsForLinkedSpan(surface: string, word: Word): RubyPart[] {
  const reading = readingForWord(word);
  const kanji = word.kanji.trim();
  if (surface === kanji && reading) {
    return [{ base: kanji, reading }];
  }
  return [{ base: surface }];
}

function sliceRubyParts(
  parts: RubyPart[],
  relStart: number,
  relEnd: number,
): RubyPart[] {
  if (relStart >= relEnd) return [];
  let pos = 0;
  const out: RubyPart[] = [];
  for (const p of parts) {
    const pStart = pos;
    const pEnd = pos + p.base.length;
    pos = pEnd;
    if (pEnd <= relStart || pStart >= relEnd) continue;
    const sliceStart = Math.max(0, relStart - pStart);
    const sliceEnd = Math.min(p.base.length, relEnd - pStart);
    const base = p.base.slice(sliceStart, sliceEnd);
    const fullPart = sliceStart === 0 && sliceEnd === p.base.length;
    out.push({
      base,
      ...(fullPart && p.reading ? { reading: p.reading } : {}),
    });
  }
  return out;
}

/** Inject furigana into text chunks for linked vocabulary (persists in targetChunks). */
export async function applyLinkedRubyToExample(
  ex: SrsExample,
  words: Word[],
): Promise<SrsExample> {
  if (!ex.targetChunks?.length || !ex.linkedTokens?.length) return ex;

  const tokenizer = await getKuromojiTokenizer();
  const wordsById = buildWordsById(words);
  const tokens = linkedTokensForDisplay(ex) ?? ex.linkedTokens;
  let offset = 0;
  const newChunks: TargetChunk[] = [];

  for (const chunk of ex.targetChunks) {
    const chunkOffset = offset;
    offset += chunk.text.length;

    if (chunk.type === "hidden") {
      newChunks.push(chunk);
      continue;
    }

    const chunkEnd = chunkOffset + chunk.text.length;
    const inChunk = tokens
      .filter((t) => t.start >= chunkOffset && t.end <= chunkEnd)
      .sort((a, b) => a.start - b.start);

    if (inChunk.length === 0) {
      newChunks.push(chunk);
      continue;
    }

    const parts: RubyPart[] = [];
    let local = 0;
    const text = chunk.text;

    for (const token of inChunk) {
      const relStart = token.start - chunkOffset;
      const relEnd = token.end - chunkOffset;
      if (relStart > local) {
        parts.push({ base: text.slice(local, relStart) });
      }
      const word = wordsById.get(token.wordId);
      const span = text.slice(relStart, relEnd);
      if (word) {
        parts.push(...buildRubyPartsForSurface(span, tokenizer));
      } else {
        parts.push({ base: span });
      }
      local = relEnd;
    }
    if (local < text.length) {
      parts.push({ base: text.slice(local) });
    }

    const hasReading = parts.some((p) => p.reading);
    newChunks.push({
      type: "text",
      text: chunk.text,
      ...(hasReading ? { ruby: parts } : {}),
    });
  }

  return { ...ex, targetChunks: newChunks };
}

function hiddenRange(sentence: string, hiddenWord?: string): [number, number] | null {
  if (!hiddenWord) return null;
  const start = sentence.indexOf(hiddenWord);
  if (start < 0) return null;
  return [start, start + hiddenWord.length];
}

export async function linkExampleSentence(
  sentence: string,
  words: Word[],
  options?: {
    hiddenRange?: [number, number] | null;
    hiddenWord?: string;
    excludeWordId?: number;
  },
): Promise<LinkedToken[]> {
  const text = sentence;
  if (!text || words.length === 0) return [];

  const tokenizer = await getKuromojiTokenizer();
  const tokens = tokenizer.tokenize(text);
  const index = buildLemmaIndex(words, options?.excludeWordId);
  const hidden =
    options?.hiddenRange ??
    (options?.hiddenWord ? hiddenRange(text, options.hiddenWord) : null);

  const links: LinkedToken[] = [];
  const usedRanges: [number, number][] = [];
  const usedTokenIndices = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    if (usedTokenIndices.has(i)) continue;

    const t = tokens[i];
    const start = tokenStart(t);
    const end = tokenEnd(t);
    if (overlapsHidden(start, end, hidden)) continue;

    const lemma = t.basic_form === "*" ? t.surface_form : t.basic_form;
    const word = index.get(lemma);
    if (!word) continue;

    const expandTo = expandConjugationEnd(tokens, i);
    const span = spanFromTokens(tokens, i, expandTo, text);
    if (overlapsHidden(span.start, span.end, hidden)) continue;
    if (usedRanges.some(([s, e]) => span.start < e && span.end > s)) continue;

    for (let k = i; k <= expandTo; k++) usedTokenIndices.add(k);

    links.push({
      start: span.start,
      end: span.end,
      surface: span.surface,
      wordId: word.id,
      lemma,
    });
    usedRanges.push([span.start, span.end]);
  }

  return links;
}

function overlapsHidden(
  start: number,
  end: number,
  hidden: [number, number] | null,
): boolean {
  if (!hidden) return false;
  return start < hidden[1] && end > hidden[0];
}

export async function linkSrsExample(
  example: SrsExample,
  words: Word[],
  excludeWordId?: number,
): Promise<LinkedToken[]> {
  const synced = syncExampleFromSentence(example);
  const text = exampleDisplayText(synced);
  return linkExampleSentence(text, words, {
    hiddenRange: primaryHiddenRangeInExample(synced),
    excludeWordId,
  });
}

export async function linkSrsExamples(
  examples: SrsExample[],
  words: Word[],
  excludeWordId?: number,
): Promise<SrsExample[]> {
  const out: SrsExample[] = [];
  for (const ex of examples) {
    const synced = syncExampleFromSentence(ex);
    if (!exampleDisplayText(synced).trim()) {
      out.push(synced);
      continue;
    }
    const text = exampleDisplayText(synced);
    const linkedTokens = await linkExampleSentence(text, words, {
      hiddenRange: primaryHiddenRangeInExample(synced),
      excludeWordId,
    });
    out.push(
      await applyLinkedRubyToExample({ ...synced, linkedTokens }, words),
    );
  }
  return out;
}

export type LinkedTextSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; wordId: number };

/** Re-seat stored linkedTokens onto targetChunk boundaries for display. */
export function linkedTokensForDisplay(
  example: SrsExample,
): LinkedToken[] | undefined {
  const raw = example.linkedTokens;
  if (!raw?.length) return raw;
  if (!example.targetChunks?.length) return raw;

  const primaryRange = primaryHiddenRangeInExample(example);
  let offset = 0;
  const realigned: LinkedToken[] = [];
  const used = new Set<number>();

  for (const chunk of example.targetChunks) {
    const chunkEnd = offset + chunk.text.length;

    if (
      chunk.type === "hidden" &&
      primaryRange &&
      offset === primaryRange[0] &&
      chunkEnd === primaryRange[1]
    ) {
      offset = chunkEnd;
      continue;
    }

    for (let ti = 0; ti < raw.length; ti++) {
      if (used.has(ti)) continue;
      const token = raw[ti];

      if (
        token.start === offset &&
        token.end === chunkEnd &&
        token.surface === chunk.text
      ) {
        realigned.push(token);
        used.add(ti);
        continue;
      }

      const localIdx = chunk.text.indexOf(token.surface);
      if (localIdx < 0) continue;

      realigned.push({
        ...token,
        start: offset + localIdx,
        end: offset + localIdx + token.surface.length,
      });
      used.add(ti);
    }

    offset = chunkEnd;
  }

  const fullText = exampleDisplayText(example);
  for (let ti = 0; ti < raw.length; ti++) {
    if (used.has(ti)) continue;
    const token = raw[ti];
    if (fullText.slice(token.start, token.end) === token.surface) {
      realigned.push(token);
    }
  }

  return realigned.length ? realigned : raw;
}

export function sliceRubyPartsForRange(
  parts: RubyPart[],
  relStart: number,
  relEnd: number,
): RubyPart[] {
  return sliceRubyParts(parts, relStart, relEnd);
}

/** Re-link every word's SRS examples against the full vocabulary list. */
export async function relinkAllWordsSrsExamples(
  words: Word[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ wordId: number; srsExamples: SrsExample[] }[]> {
  const toUpdate = words.filter((w) =>
    w.srsExamples?.some((ex) => exampleDisplayText(ex).trim()),
  );
  const total = toUpdate.length;
  const results: { wordId: number; srsExamples: SrsExample[] }[] = [];

  for (let i = 0; i < toUpdate.length; i++) {
    const word = toUpdate[i];
    const linked = await linkSrsExamples(
      word.srsExamples,
      words,
      word.id,
    );
    results.push({ wordId: word.id, srsExamples: linked });
    onProgress?.(i + 1, total);
  }

  return results;
}

export function findLinkedTokenForChunk(
  chunkOffset: number,
  chunkText: string,
  linkedTokens?: LinkedToken[],
): LinkedToken | undefined {
  if (!linkedTokens?.length || !chunkText) return undefined;
  const chunkEnd = chunkOffset + chunkText.length;
  return (
    linkedTokens.find(
      (t) => t.start === chunkOffset && t.end === chunkEnd,
    ) ??
    linkedTokens.find(
      (t) =>
        t.start >= chunkOffset &&
        t.end <= chunkEnd &&
        t.surface === chunkText.trim(),
    )
  );
}

/** Split chunk text using global char offsets in the full sentence. */
export function segmentTextWithLinks(
  text: string,
  chunkOffset: number,
  linkedTokens: LinkedToken[] | undefined,
): LinkedTextSegment[] {
  if (!text || !linkedTokens?.length) {
    return [{ kind: "text", text }];
  }

  const chunkEnd = chunkOffset + text.length;
  const inChunk = linkedTokens
    .filter((t) => t.start >= chunkOffset && t.end <= chunkEnd)
    .sort((a, b) => a.start - b.start);

  if (inChunk.length === 0) return [{ kind: "text", text }];

  const segs: LinkedTextSegment[] = [];
  let local = 0;

  for (const token of inChunk) {
    const relStart = token.start - chunkOffset;
    const relEnd = token.end - chunkOffset;
    if (relStart > local) {
      segs.push({ kind: "text", text: text.slice(local, relStart) });
    }
    segs.push({
      kind: "link",
      text: text.slice(relStart, relEnd),
      wordId: token.wordId,
    });
    local = relEnd;
  }

  if (local < text.length) {
    segs.push({ kind: "text", text: text.slice(local) });
  }

  return segs;
}
