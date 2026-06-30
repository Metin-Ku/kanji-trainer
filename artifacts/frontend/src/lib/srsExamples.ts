import type { SrsExample, SrsExampleHint, TargetChunk, HiddenScript, RubyPart } from "../types";
import { kanaVariants, effectiveHiddenScript } from "./japaneseInput";

export type { SrsExample, SrsExampleHint };

function extractPlainText(el: Element): string {
  el.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return elementSurfaceText(el).trim();
}

function hiddenScriptFromEl(el: Element): HiddenScript {
  if (el.classList.contains("word--katakana")) return "katakana";
  if (el.classList.contains("word--hiragana")) return "hiragana";
  return "kanji";
}

function parseRubyParts(el: Element): RubyPart[] {
  const parts: RubyPart[] = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent ?? "";
      if (t) parts.push({ base: t });
    } else if (node.nodeName === "RUBY") {
      const ruby = node as Element;
      const rt = ruby.querySelector("rt")?.textContent ?? "";
      const clone = ruby.cloneNode(true) as Element;
      clone.querySelector("rt")?.remove();
      clone.querySelectorAll("rp").forEach((rp) => rp.remove());
      const base = clone.textContent ?? "";
      parts.push({ base, ...(rt ? { reading: rt } : {}) });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      if (child.tagName !== "RT" && child.tagName !== "RP") {
        parts.push(...parseRubyParts(child));
      }
    }
  });
  return parts;
}

function rubyPartsToText(parts: RubyPart[]): string {
  return parts.map((p) => p.base).join("");
}

function rubyPartsToReading(parts: RubyPart[]): string {
  return parts.map((p) => p.reading ?? p.base).join("");
}

function parseHiddenSpan(el: Element): TargetChunk {
  const script = hiddenScriptFromEl(el);
  const ruby = parseRubyParts(el);
  const text = ruby.length > 0 ? rubyPartsToText(ruby) : (el.textContent?.trim() ?? "");
  const reading =
    ruby.length > 0 ? rubyPartsToReading(ruby) : el.textContent?.trim() ?? "";
  return {
    type: "hidden",
    text,
    reading,
    ruby: ruby.length > 0 ? ruby : undefined,
    script,
  };
}

function appendTextChunk(chunks: TargetChunk[], text: string) {
  if (!text) return;
  const last = chunks[chunks.length - 1];
  if (last?.type === "text") {
    last.text += text;
  } else {
    chunks.push({ type: "text", text });
  }
}

function walkTargetNodes(node: Node, chunks: TargetChunk[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    appendTextChunk(chunks, node.textContent ?? "");
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;

  if (el.classList.contains("word--hidden")) {
    chunks.push(parseHiddenSpan(el));
    return;
  }

  if (el.tagName === "RUBY") {
    const ruby = parseRubyParts(el);
    chunks.push({
      type: "text",
      text: rubyPartsToText(ruby),
      ruby,
    });
    return;
  }

  el.childNodes.forEach((child) => walkTargetNodes(child, chunks));
}

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

/** Rebuild targetChunks from the edited sentence field, preserving ruby/hidden metadata. */
export function syncTargetChunksFromSentence(
  ex: SrsExample,
): TargetChunk[] | undefined {
  const sentence = ex.sentence.trim();
  if (!sentence || !ex.targetChunks?.length) return ex.targetChunks;

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

  const chunks: TargetChunk[] = [];
  if (before) chunks.push({ type: "text", text: before });

  chunks.push({
    ...(primaryHidden ?? { type: "hidden" as const }),
    type: "hidden",
    text: hiddenWord,
    reading: primaryHidden?.reading ?? ex.hiddenReading,
    ruby: primaryHidden?.ruby,
    script: primaryHidden?.script ?? ex.hiddenScript,
  });

  chunks.push(...rebuildChunksAfterPrimary(afterPrimary, secondaryHidden));
  return chunks;
}

/** Keep sentence, targetChunks, and linkedTokens aligned after manual edits. */
export function syncExampleFromSentence(ex: SrsExample): SrsExample {
  const sentence = ex.sentence.trim();
  const targetChunks = syncTargetChunksFromSentence({ ...ex, sentence });
  if (!targetChunks) return { ...ex, sentence };

  return {
    ...ex,
    sentence: targetChunksToSentence(targetChunks).trim(),
    targetChunks,
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

/** Surface text of an element — omits `<rt>` readings from ruby. */
export function elementSurfaceText(el: Element): string {
  let out = "";
  el.childNodes.forEach((node) => {
    out += surfaceTextFromNode(node);
  });
  return out;
}

function surfaceTextFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  if (el.tagName === "RT" || el.tagName === "RP") return "";
  if (el.tagName === "RUBY") {
    let base = "";
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as Element).tagName;
        if (tag === "RT" || tag === "RP") return;
      }
      base += surfaceTextFromNode(child);
    });
    return base;
  }
  let out = "";
  el.childNodes.forEach((child) => {
    out += surfaceTextFromNode(child);
  });
  return out;
}

export function targetElToSurfaceText(targetEl: Element): string {
  return targetChunksToSentence(parseTargetEl(targetEl));
}

export function parseTargetEl(targetEl: Element): TargetChunk[] {
  const chunks: TargetChunk[] = [];
  targetEl.childNodes.forEach((n) => walkTargetNodes(n, chunks));
  return chunks;
}

function buildExampleFromTarget(
  targetEl: Element,
  order: number,
  exEl: Element,
): SrsExample | null {
  if (isIgnored(targetEl)) return null;

  const targetChunks = parseTargetEl(targetEl);
  const sentence = targetChunksToSentence(targetChunks);
  const hiddenEl = targetEl.querySelector(".word--hidden");
  let hiddenWord = "";
  let hiddenReading: string | undefined;
  let hiddenScript: HiddenScript | undefined;
  if (hiddenEl) {
    const parsed = parseHiddenWordEl(hiddenEl);
    hiddenWord = parsed.text;
    hiddenReading = parsed.reading;
    hiddenScript = parsed.script;
  }

  const hints: SrsExampleHint[] = [];
  exEl.querySelectorAll(".sentence--line").forEach((lineEl) => {
    if (isIgnored(lineEl)) return;
    const text = lineText(lineEl);
    const highlights: string[] = [];
    lineEl.querySelectorAll(".word--highlight").forEach((h) => {
      const t = h.textContent?.trim();
      if (t) highlights.push(t);
    });
    hints.push({
      text,
      ...(highlights.length > 0 ? { highlights } : {}),
    });
  });

  return {
    order,
    sentence,
    hiddenWord,
    ...(hiddenReading ? { hiddenReading } : {}),
    ...(hiddenScript ? { hiddenScript } : {}),
    ...(targetChunks.length > 0 ? { targetChunks } : {}),
    hints,
  };
}

function parseHiddenWordEl(hiddenEl: Element): {
  text: string;
  reading: string;
  script: HiddenScript;
  ruby?: RubyPart[];
} {
  const chunk = parseHiddenSpan(hiddenEl);
  return {
    text: chunk.text,
    reading: chunk.reading ?? chunk.text,
    script: chunk.script ?? "kanji",
    ruby: chunk.ruby,
  };
}

function isIgnored(el: Element): boolean {
  return el.classList.contains("ignore");
}

function lineText(lineEl: Element): string {
  let text = lineEl.textContent?.trim() ?? "";
  return text.replace(/^-->\s*/, "");
}

/** Plain description from HTML — includes all lines (ignore + non-ignore). */
function htmlExamplesToPlainDescription(descEl: Element): string {
  const blocks: string[] = [];
  descEl.querySelectorAll(".example").forEach((exEl) => {
    const lines: string[] = [];
    const target = exEl.querySelector(".sentence--target");
    if (target) {
      const text = targetElToSurfaceText(target).trim();
      if (text) lines.push(text);
    }
    exEl.querySelectorAll(".sentence--line").forEach((lineEl) => {
      const text = lineText(lineEl);
      if (text) lines.push(`--> ${text}`);
    });
    if (lines.length > 0) blocks.push(lines.join("\n"));
  });
  if (blocks.length > 0) return blocks.join("\n\n");

  const looseTargets = descEl.querySelectorAll(".sentence--target");
  if (looseTargets.length > 0) {
    const lines: string[] = [];
    looseTargets.forEach((target) => {
      const text = targetElToSurfaceText(target).trim();
      if (text) lines.push(text);
    });
    return lines.join("\n\n");
  }

  return extractPlainText(descEl);
}

export function parseBulkDescriptionHtml(descEl: Element): {
  description: string;
  srsExamples: SrsExample[];
} {
  const exampleEls = descEl.querySelectorAll(".example");
  const srsExamples: SrsExample[] = [];

  if (exampleEls.length > 0) {
    exampleEls.forEach((exEl) => {
      const rawOrder = parseInt(exEl.getAttribute("data-order") ?? "", 10);
      const targetEl = exEl.querySelector(".sentence--target");
      if (!targetEl) return;
      const ex = buildExampleFromTarget(
        targetEl,
        Number.isNaN(rawOrder) ? srsExamples.length : rawOrder,
        exEl,
      );
      if (ex) srsExamples.push(ex);
    });
  } else {
    descEl.querySelectorAll(".sentence--target").forEach((targetEl) => {
      const ex = buildExampleFromTarget(
        targetEl,
        srsExamples.length,
        descEl,
      );
      if (ex) srsExamples.push(ex);
    });
  }

  if (srsExamples.length === 0) {
    return { description: extractPlainText(descEl), srsExamples: [] };
  }

  srsExamples.sort((a, b) => a.order - b.order);
  srsExamples.forEach((ex, i) => {
    ex.order = i;
  });

  return {
    description: htmlExamplesToPlainDescription(descEl),
    srsExamples,
  };
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
    return {
      order: i,
      sentence,
      hiddenWord:
        defaultHiddenWord && sentence.includes(defaultHiddenWord)
          ? defaultHiddenWord
          : "",
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

export function getExpectedAnswer(ex: SrsExample, headwordKanji?: string): string {
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
      ...(synced.targetChunks?.length ? { targetChunks: synced.targetChunks } : {}),
      ...(synced.linkedTokens?.length ? { linkedTokens: synced.linkedTokens } : {}),
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

/** Render hint text with highlight spans for SRS / editor preview. */
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
