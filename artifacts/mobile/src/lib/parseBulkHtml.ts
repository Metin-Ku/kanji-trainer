import { parseBracketList, parseCategoryBracketList } from "./categoryMatch";
import type { HiddenScript, RubyPart, SrsExample } from "./types";
import { inferHiddenScript } from "./japaneseScript";
import {
  parsePlainDescriptionToSrsExamples,
  sanitizeSrsExamples,
  syncExampleFromSentence,
  usefulRuby,
} from "./srsExamples";

export type BulkWordInput = {
  kanji: string;
  pronunciation: string;
  meaning: string;
  description: string;
  srsExamples?: SrsExample[];
  jlptLevel?: string;
  categoryNames?: string[];
  synonymKanji?: string[];
};

const JLPT_SET = new Set(["N1", "N2", "N3", "N4", "N5"]);

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim();
}

/** Inner HTML of every `<div class="…className…">` (handles nested divs). */
function extractDivContents(html: string, className: string): string[] {
  const results: string[] = [];
  const openRe = new RegExp(
    `<div[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`,
    "gi",
  );
  let openMatch: RegExpExecArray | null;
  while ((openMatch = openRe.exec(html)) !== null) {
    const innerStart = openMatch.index + openMatch[0].length;
    let depth = 1;
    let i = innerStart;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", i);
      const nextClose = html.indexOf("</div>", i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
        continue;
      }
      depth -= 1;
      if (depth === 0) {
        results.push(html.slice(innerStart, nextClose));
        i = nextClose + 6;
      } else {
        i = nextClose + 6;
      }
    }
  }
  return results;
}

/** Each `.example` block's inner HTML (handles nested divs). */
function extractExampleBlocks(html: string): string[] {
  const results: string[] = [];
  const openRe = /class="[^"]*\bexample\b[^"]*"[^>]*>/gi;
  let openMatch: RegExpExecArray | null;
  while ((openMatch = openRe.exec(html)) !== null) {
    const gt = html.indexOf(">", openMatch.index);
    if (gt < 0) continue;
    const innerStart = gt + 1;
    let depth = 1;
    let i = innerStart;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", i);
      const nextClose = html.indexOf("</div>", i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
        continue;
      }
      depth -= 1;
      if (depth === 0) {
        results.push(html.slice(innerStart, nextClose));
      }
      i = nextClose + 6;
    }
  }
  return results;
}

function lineTextFromHtml(lineHtml: string): string {
  return stripTags(lineHtml).replace(/^-->\s*/, "").trim();
}

function divHasClass(classAttr: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(classAttr);
}

/** Plain description for one example block — mirrors web htmlExamplesToPlainDescription. */
function plainDescriptionFromExampleBlock(blockHtml: string): string {
  const lines: string[] = [];
  const targetHtml = extractDivContents(blockHtml, "sentence--target")[0];
  if (targetHtml) {
    const sentence = htmlSurfaceText(targetHtml);
    if (sentence) lines.push(sentence);
  }
  const lineOpenRe =
    /<div[^>]*class="([^"]*\bsentence--line\b[^"]*)"[^>]*>/gi;
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = lineOpenRe.exec(blockHtml)) !== null) {
    const innerStart = lineMatch.index + lineMatch[0].length;
    let depth = 1;
    let i = innerStart;
    let innerEnd = -1;
    while (i < blockHtml.length && depth > 0) {
      const nextOpen = blockHtml.indexOf("<div", i);
      const nextClose = blockHtml.indexOf("</div>", i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
        continue;
      }
      depth -= 1;
      if (depth === 0) innerEnd = nextClose;
      i = nextClose + 6;
    }
    if (innerEnd < 0) continue;
    const text = lineTextFromHtml(blockHtml.slice(innerStart, innerEnd));
    if (text) lines.push(`--> ${text}`);
  }
  return lines.join("\n");
}

function htmlExamplesToPlainDescription(html: string): string {
  const blocks = extractExampleBlocks(html);
  if (blocks.length > 0) {
    return blocks
      .map((block) => plainDescriptionFromExampleBlock(block))
      .filter(Boolean)
      .join("\n\n");
  }

  const targets = extractDivContents(html, "sentence--target");
  if (targets.length > 0) {
    return targets
      .map((targetHtml) => htmlSurfaceText(targetHtml))
      .filter(Boolean)
      .join("\n\n");
  }

  return stripTags(html);
}

function extractHtmlByClass(fragment: string, className: string): string {
  const re = new RegExp(
    `<([a-z]+)[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`,
    "i",
  );
  const match = fragment.match(re);
  return match?.[2] ?? "";
}

function extractTextByClass(fragment: string, className: string): string {
  return stripTags(extractHtmlByClass(fragment, className));
}

function htmlSurfaceText(html: string): string {
  const withoutRt = html.replace(/<ruby[^>]*>([\s\S]*?)<\/ruby>/gi, (_, inner) =>
    inner
      .replace(/<rt[^>]*>[\s\S]*?<\/rt>/gi, "")
      .replace(/<rp[^>]*>[\s\S]*?<\/rp>/gi, "")
      .replace(/<[^>]+>/g, ""),
  );
  return stripTags(withoutRt);
}

function parseRubyPartsFromHtml(html: string): RubyPart[] {
  const parts: RubyPart[] = [];
  const re = /<ruby[^>]*>([\s\S]*?)<\/ruby>|([^<]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match[1] !== undefined) {
      const rubyInner = match[1];
      const rtMatch = rubyInner.match(/<rt[^>]*>([\s\S]*?)<\/rt>/i);
      const reading = rtMatch ? stripTags(rtMatch[1]) : undefined;
      const base = stripTags(
        rubyInner
          .replace(/<rt[^>]*>[\s\S]*?<\/rt>/gi, "")
          .replace(/<rp[^>]*>[\s\S]*?<\/rp>/gi, ""),
      );
      if (base) parts.push({ base, ...(reading ? { reading } : {}) });
    } else if (match[2]) {
      const text = stripTags(match[2]);
      if (text) parts.push({ base: text });
    }
  }
  return parts;
}

function hiddenScriptFromClasses(classAttr: string): HiddenScript {
  if (/\bword--katakana\b/.test(classAttr)) return "katakana";
  if (/\bword--hiragana\b/.test(classAttr)) return "hiragana";
  return "kanji";
}

function parseHiddenSpanHtml(fragment: string): {
  text: string;
  reading: string;
  hiddenScript: HiddenScript;
  ruby?: RubyPart[];
} | null {
  const match = fragment.match(
    /class="([^"]*\bword--hidden\b[^"]*)"[^>]*>([\s\S]*?)<\//i,
  );
  if (!match?.[2]) return null;

  const hiddenScript = hiddenScriptFromClasses(match[1] ?? "");
  const rubyRaw = parseRubyPartsFromHtml(match[2]);
  const text = rubyRaw.length
    ? rubyRaw.map((p) => p.base).join("")
    : stripTags(match[2]);
  const reading = rubyRaw.length
    ? rubyRaw.map((p) => p.reading ?? p.base).join("")
    : text;
  const script =
    hiddenScript !== "kanji" ? hiddenScript : inferHiddenScript(text);

  return {
    text,
    reading,
    hiddenScript: script,
    ruby: usefulRuby(rubyRaw.length ? rubyRaw : undefined),
  };
}

function extractHiddenWord(fragment: string): string {
  return parseHiddenSpanHtml(fragment)?.text ?? "";
}

function extractHintHighlights(lineHtml: string): string[] {
  const highlights: string[] = [];
  const re = /class="[^"]*\bword--highlight\b[^"]*"[^>]*>([\s\S]*?)<\//gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(lineHtml)) !== null) {
    const text = stripTags(match[1] ?? "");
    if (text) highlights.push(text);
  }
  return highlights;
}

function buildExampleFromTarget(
  targetHtml: string,
  order: number,
  blockHtml: string,
  fallbackKanji: string,
): SrsExample | null {
  const sentence = htmlSurfaceText(targetHtml);
  if (!sentence) return null;

  const hidden = parseHiddenSpanHtml(targetHtml);
  const hiddenWord = hidden?.text || fallbackKanji;
  const hints: SrsExample["hints"] = [];
  const lineOpenRe =
    /<div[^>]*class="([^"]*\bsentence--line\b[^"]*)"[^>]*>/gi;
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = lineOpenRe.exec(blockHtml)) !== null) {
    const classAttr = lineMatch[1] ?? "";
    if (divHasClass(classAttr, "ignore")) continue;
    const innerStart = lineMatch.index + lineMatch[0].length;
    let depth = 1;
    let i = innerStart;
    let innerEnd = -1;
    while (i < blockHtml.length && depth > 0) {
      const nextOpen = blockHtml.indexOf("<div", i);
      const nextClose = blockHtml.indexOf("</div>", i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
        continue;
      }
      depth -= 1;
      if (depth === 0) innerEnd = nextClose;
      i = nextClose + 6;
    }
    if (innerEnd < 0) continue;
    const lineHtml = blockHtml.slice(innerStart, innerEnd);
    const text = lineTextFromHtml(lineHtml);
    if (!text) continue;
    const highlights = extractHintHighlights(lineHtml);
    hints.push({
      text,
      ...(highlights.length > 0 ? { highlights } : {}),
    });
  }

  const base: SrsExample = {
    order,
    sentence,
    hiddenWord,
    hints,
    ...(hidden?.reading ? { hiddenReading: hidden.reading } : {}),
    ...(hidden?.hiddenScript ? { hiddenScript: hidden.hiddenScript } : {}),
  };

  let ex = syncExampleFromSentence(base);
  if (hidden?.ruby && ex.targetChunks?.length) {
    ex = {
      ...ex,
      targetChunks: ex.targetChunks.map((c) =>
        c.type === "hidden" && c.text === hiddenWord
          ? {
              ...c,
              ruby: hidden.ruby,
              reading: hidden.reading,
              script: hidden.hiddenScript,
            }
          : c,
      ),
    };
  }
  return ex;
}

function parseDescriptionCell(html: string, kanji: string): {
  description: string;
  srsExamples: SrsExample[];
} {
  const exampleBlocks = extractExampleBlocks(html);
  const srsExamples: SrsExample[] = [];

  if (exampleBlocks.length > 0) {
    exampleBlocks.forEach((block, i) => {
      const targetHtml = extractDivContents(block, "sentence--target")[0];
      if (!targetHtml) return;
      const ex = buildExampleFromTarget(targetHtml, i, block, kanji);
      if (ex) srsExamples.push(ex);
    });
  } else {
    const targets = extractDivContents(html, "sentence--target");
    targets.forEach((targetHtml, i) => {
      const ex = buildExampleFromTarget(targetHtml, i, html, kanji);
      if (ex) srsExamples.push(ex);
    });
  }

  if (srsExamples.length > 0) {
    return {
      description: htmlExamplesToPlainDescription(html),
      srsExamples: sanitizeSrsExamples(srsExamples),
    };
  }

  const plain = stripTags(html);
  return {
    description: plain,
    srsExamples: parsePlainDescriptionToSrsExamples(plain, kanji),
  };
}

export function parseTableHtml(html: string): BulkWordInput[] {
  const words: BulkWordInput[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(html)) !== null) {
    const row = rowMatch[1]!;
    const kanji = extractTextByClass(row, "word");
    if (!kanji || kanji === "Word" || kanji === "Kelime") continue;

    const rawJlpt = extractTextByClass(row, "jlpt").toUpperCase();
    const jlptLevel = JLPT_SET.has(rawJlpt) ? rawJlpt : undefined;
    const catRaw = extractTextByClass(row, "categories");
    const synRaw = extractTextByClass(row, "synonyms");
    const categoryNames = catRaw
      ? parseCategoryBracketList(catRaw)
      : undefined;
    const synonymKanji = synRaw
      ? parseBracketList(synRaw).filter((k) => k !== kanji)
      : undefined;

    const descHtml = extractHtmlByClass(row, "description");
    const parsedDesc = parseDescriptionCell(descHtml, kanji);

    words.push({
      kanji,
      pronunciation: extractTextByClass(row, "pronunciation"),
      meaning: extractTextByClass(row, "meaning"),
      description: parsedDesc.description || stripTags(descHtml),
      srsExamples:
        parsedDesc.srsExamples.length > 0 ? parsedDesc.srsExamples : undefined,
      ...(jlptLevel ? { jlptLevel } : {}),
      ...(categoryNames && categoryNames.length > 0 ? { categoryNames } : {}),
      ...(synonymKanji && synonymKanji.length > 0 ? { synonymKanji } : {}),
    });
  }

  return words;
}
