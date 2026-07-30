import type {
  HiddenScript,
  RubyPart,
  SrsExample,
  SrsExampleHint,
  TargetChunk,
} from "./types";
import { kanaVariants } from "./japaneseInput";
import { inferHiddenScript } from "./japaneseScript";

export type { SrsExample, SrsExampleHint };

export function targetChunksToSentence(chunks: TargetChunk[]): string {
  return chunks.map((c) => c.text).join("");
}

function chunksMatchSentence(chunks: TargetChunk[], sentence: string): boolean {
  const fromChunks = targetChunksToSentence(chunks);
  return fromChunks === sentence || fromChunks.trim() === sentence;
}

function rebuildChunksAfterPrimary(
  text: string,
  secondaryHidden: TargetChunk[],
): TargetChunk[] {
  if (!text && secondaryHidden.length === 0) return [];
  if (secondaryHidden.length === 0) {
    return text ? [{ type: "text", text }] : [];
  }

  const chunks: TargetChunk[] = [];
  let remaining = text;

  for (const hidden of secondaryHidden) {
    const idx = remaining.indexOf(hidden.text);
    if (idx < 0) continue;
    if (idx > 0) chunks.push({ type: "text", text: remaining.slice(0, idx) });
    chunks.push({ ...hidden, type: "hidden" });
    remaining = remaining.slice(idx + hidden.text.length);
  }

  if (remaining) chunks.push({ type: "text", text: remaining });
  return chunks;
}

/** Drop ruby that has no furigana readings (kana-only bases need no ruby). */
export function usefulRuby(parts?: RubyPart[]): RubyPart[] | undefined {
  if (!parts?.length) return undefined;
  if (!parts.some((p) => p.reading)) return undefined;
  return parts;
}

/** Build cloze targetChunks from sentence + hiddenWord when none exist yet. */
export function buildTargetChunksFromCloze(
  ex: SrsExample,
): TargetChunk[] | undefined {
  const sentence = ex.sentence.trim();
  if (!sentence) return undefined;

  const hiddenWord = ex.hiddenWord.trim();
  if (!hiddenWord || !sentence.includes(hiddenWord)) {
    return [{ type: "text", text: sentence }];
  }

  const script = ex.hiddenScript ?? inferHiddenScript(hiddenWord);
  const reading =
    ex.hiddenReading?.trim() ||
    (script === "hiragana" || script === "katakana" ? hiddenWord : undefined);

  const hiddenStart = sentence.indexOf(hiddenWord);
  const before = sentence.slice(0, hiddenStart);
  const after = sentence.slice(hiddenStart + hiddenWord.length);

  const chunks: TargetChunk[] = [];
  if (before) chunks.push({ type: "text", text: before });
  chunks.push({
    type: "hidden",
    text: hiddenWord,
    script,
    ...(reading ? { reading } : {}),
  });
  if (after) chunks.push({ type: "text", text: after });
  return chunks;
}

/** Rebuild targetChunks from the edited sentence field, preserving ruby/hidden metadata. */
export function syncTargetChunksFromSentence(
  ex: SrsExample,
): TargetChunk[] | undefined {
  const sentence = ex.sentence.trim();
  if (!sentence) return ex.targetChunks;

  if (!ex.targetChunks?.length) {
    return buildTargetChunksFromCloze({ ...ex, sentence });
  }

  if (chunksMatchSentence(ex.targetChunks, sentence)) {
    return ex.targetChunks;
  }

  const hiddenWord = ex.hiddenWord.trim();
  if (!hiddenWord || !sentence.includes(hiddenWord)) {
    return [{ type: "text", text: sentence }];
  }

  const primaryHidden =
    ex.targetChunks.find(
      (c) => c.type === "hidden" && c.text === hiddenWord,
    ) ?? ex.targetChunks.find((c) => c.type === "hidden");

  const secondaryHidden = ex.targetChunks.filter(
    (c) => c.type === "hidden" && c !== primaryHidden,
  );

  const hiddenStart = sentence.indexOf(hiddenWord);
  const before = sentence.slice(0, hiddenStart);
  const afterPrimary = sentence.slice(hiddenStart + hiddenWord.length);
  const script =
    primaryHidden?.script ??
    ex.hiddenScript ??
    inferHiddenScript(hiddenWord);
  const reading =
    primaryHidden?.reading ??
    ex.hiddenReading ??
    (script === "hiragana" || script === "katakana" ? hiddenWord : undefined);
  const ruby = usefulRuby(primaryHidden?.ruby);

  const chunks: TargetChunk[] = [];
  if (before) chunks.push({ type: "text", text: before });

  chunks.push({
    type: "hidden",
    text: hiddenWord,
    script,
    ...(reading ? { reading } : {}),
    ...(ruby ? { ruby } : {}),
  });

  chunks.push(...rebuildChunksAfterPrimary(afterPrimary, secondaryHidden));
  return chunks;
}

/** Keep sentence, targetChunks, and linkedTokens aligned after manual edits. */
export function syncExampleFromSentence(ex: SrsExample): SrsExample {
  const sentence = ex.sentence.trim();
  const hiddenWord = ex.hiddenWord.trim();
  const inferredScript =
    ex.hiddenScript ??
    (hiddenWord ? inferHiddenScript(hiddenWord) : undefined);
  const targetChunks = syncTargetChunksFromSentence({
    ...ex,
    sentence,
    hiddenWord,
    ...(inferredScript ? { hiddenScript: inferredScript } : {}),
  });
  if (!targetChunks) {
    return {
      ...ex,
      sentence,
      hiddenWord,
      ...(inferredScript ? { hiddenScript: inferredScript } : {}),
    };
  }

  const primary = targetChunks.find((c) => c.type === "hidden");
  return {
    ...ex,
    sentence: targetChunksToSentence(targetChunks).trim(),
    hiddenWord,
    targetChunks,
    ...(inferredScript || primary?.script
      ? { hiddenScript: inferredScript ?? primary?.script }
      : {}),
    ...(primary?.reading || ex.hiddenReading
      ? { hiddenReading: primary?.reading ?? ex.hiddenReading }
      : {}),
  };
}

/** Same string used for display offsets and kuromoji linking. */
export function exampleDisplayText(ex: SrsExample): string {
  const sentence = ex.sentence.trim();
  if (ex.targetChunks?.length) {
    const fromChunks = targetChunksToSentence(ex.targetChunks);
    if (chunksMatchSentence(ex.targetChunks, sentence)) {
      return fromChunks;
    }
    return sentence;
  }
  return sentence;
}

/** Character range of the primary cloze blank in `exampleDisplayText`. */
export function primaryHiddenRangeInExample(
  ex: SrsExample,
): [number, number] | null {
  if (ex.targetChunks?.length) {
    let offset = 0;
    const primary =
      ex.targetChunks.find(
        (c) => c.type === "hidden" && c.text === ex.hiddenWord,
      ) ?? ex.targetChunks.find((c) => c.type === "hidden");
    if (!primary) return null;
    for (const chunk of ex.targetChunks) {
      if (chunk === primary) {
        return [offset, offset + chunk.text.length];
      }
      offset += chunk.text.length;
    }
    return null;
  }
  const text = ex.sentence.trim();
  const start = text.indexOf(ex.hiddenWord);
  if (start < 0) return null;
  return [start, start + ex.hiddenWord.length];
}

export function srsExamplesToPlainDescription(examples: SrsExample[]): string {
  return examples
    .map((ex) => {
      const lines = [ex.sentence, ...ex.hints.map((h) => `--> ${h.text}`)];
      return lines.join("\n");
    })
    .join("\n\n");
}

export function parsePlainDescriptionToSrsExamples(
  text: string,
  defaultHiddenWord: string,
): SrsExample[] {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
  return blocks.map((block, i) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const sentence = lines[0] ?? "";
    const hints = lines.slice(1).map((l) => ({
      text: l.replace(/^-->\s*/, ""),
    }));
    const hiddenWord =
      defaultHiddenWord && sentence.includes(defaultHiddenWord)
        ? defaultHiddenWord
        : "";
    const hiddenScript = hiddenWord
      ? inferHiddenScript(hiddenWord)
      : undefined;
    return {
      order: i,
      sentence,
      hiddenWord,
      ...(hiddenScript ? { hiddenScript } : {}),
      ...(hiddenScript === "hiragana" || hiddenScript === "katakana"
        ? { hiddenReading: hiddenWord }
        : {}),
      hints,
    };
  });
}

export function renderClozeSentence(
  sentence: string,
  hiddenWord: string,
  reveal = false,
): string {
  if (!hiddenWord || !sentence.includes(hiddenWord)) return sentence;
  if (reveal) return sentence;
  return sentence.replace(hiddenWord, "＿＿");
}

export function getExpectedAnswer(
  ex: SrsExample,
  headwordKanji?: string,
): string {
  const script = ex.hiddenScript ?? "kanji";
  if (script === "hiragana") {
    return ex.hiddenReading ?? ex.hiddenWord;
  }
  if (script === "katakana") {
    return ex.hiddenReading ?? ex.hiddenWord;
  }
  return ex.hiddenWord || headwordKanji || "";
}

/** Expected string for partial (character-level) feedback in the blank. */
export function expectedForPartialFeedback(
  ex: SrsExample,
  input: string,
  headwordKanji?: string,
): string {
  const primary = ex.targetChunks?.find((c) => c.type === "hidden");
  const isKana = /^[\u3040-\u309F\u30A0-\u30FF]+$/.test(input.trim());

  if (primary) {
    const reading = primary.reading || ex.hiddenReading || "";
    if (isKana && reading) return reading;
    if (primary.script === "hiragana" || primary.script === "katakana") {
      return reading || primary.text;
    }
    return primary.text;
  }

  if (isKana && ex.hiddenReading) return ex.hiddenReading;
  return getExpectedAnswer(ex, headwordKanji);
}

export function normalizeAnswer(s: string): string {
  return s.trim().normalize("NFC");
}

export function extractReading(pronunciation: string): string {
  const m = pronunciation.trim().match(/^([^\s(]+)/);
  return m?.[1] ?? "";
}

export function gradeClozeAnswer(
  input: string,
  hiddenWord: string,
  pronunciation: string,
  headwordKanji?: string,
  hiddenReading?: string,
  hiddenScript?: HiddenScript,
): boolean {
  const accepted = new Set<string>();
  const add = (s?: string) => {
    const n = normalizeAnswer(s ?? "");
    if (n) accepted.add(n);
  };

  const script = hiddenScript ?? "kanji";
  add(hiddenWord);
  if (script === "kanji") add(headwordKanji);
  add(extractReading(pronunciation));
  add(hiddenReading);

  for (const variant of kanaVariants(input, script)) {
    if (accepted.has(variant)) return true;
  }

  const n = normalizeAnswer(input);
  return accepted.has(n);
}

export function sanitizeSrsExamples(examples: SrsExample[]): SrsExample[] {
  return examples
    .map((ex, i) => {
      const synced = syncExampleFromSentence(ex);
      return {
        order: i,
        sentence: synced.sentence.trim(),
        hiddenWord: synced.hiddenWord.trim(),
        ...(synced.hiddenReading?.trim()
          ? { hiddenReading: synced.hiddenReading.trim() }
          : {}),
        ...(synced.hiddenScript ? { hiddenScript: synced.hiddenScript } : {}),
        ...(synced.targetChunks?.length
          ? { targetChunks: synced.targetChunks }
          : {}),
        ...(synced.linkedTokens?.length
          ? { linkedTokens: synced.linkedTokens }
          : {}),
        hints: ex.hints
          .map((h) => ({
            text: h.text.trim(),
            highlights: h.highlights
              ?.map((x) => x.trim())
              .filter((x) => x && h.text.includes(x)),
          }))
          .filter((h) => h.text),
      };
    })
    .filter((ex) => ex.sentence);
}

/** Render hint text with highlight spans for SRS study. */
export function renderHintParts(
  text: string,
  highlights?: string[],
): { text: string; highlight: boolean }[] {
  if (!highlights?.length) return [{ text, highlight: false }];

  const sorted = [...highlights].sort((a, b) => b.length - a.length);
  const parts: { text: string; highlight: boolean }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliest = -1;
    let matched = "";
    for (const h of sorted) {
      const idx = remaining.indexOf(h);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        matched = h;
      }
    }
    if (earliest === -1) {
      parts.push({ text: remaining, highlight: false });
      break;
    }
    if (earliest > 0) {
      parts.push({ text: remaining.slice(0, earliest), highlight: false });
    }
    parts.push({ text: matched, highlight: true });
    remaining = remaining.slice(earliest + matched.length);
  }

  return parts.filter((p) => p.text);
}

/** Ensure targetChunks exist for study display (runtime fallback). */
export function exampleForStudy(ex: SrsExample): SrsExample {
  if (ex.targetChunks?.length) return ex;
  const targetChunks = buildTargetChunksFromCloze(ex);
  if (!targetChunks) return ex;
  return { ...ex, targetChunks };
}
