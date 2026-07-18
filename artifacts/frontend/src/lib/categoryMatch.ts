import type { CategorySummary } from "../hooks/useCategories";

/** Strip emoji / diacritics and normalize separators for fuzzy category matching. */
export function normalizeCategoryLabel(value: string): string {
  if (!value) return "";
  let s = value.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
    "",
  );
  // Keep tokens separable: ・ becomes space (do not delete — used in names)
  s = s.replace(/[・·\u00B7\u30FB、\/;,]+/g, " ");
  s = s.normalize("NFD").replace(/\p{M}/gu, "");
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  return s;
}

function categoryTokens(norm: string): string[] {
  return norm
    .split(/[^a-z0-9çğıöşü\u3040-\u30ff\u4e00-\u9fff]+/i)
    .filter(Boolean);
}

/**
 * Match a user-provided category label to a stored category.
 * Supports partial names: "Odalar" → "Odalar・Bina・Mekân".
 */
export function matchCategoryName(
  input: string,
  categories: Pick<CategorySummary, "id" | "name">[],
  minScore = 0.45,
): number | null {
  const norm = normalizeCategoryLabel(input);
  if (!norm) return null;

  let best: { id: number; score: number } | null = null;

  for (const cat of categories) {
    const catNorm = normalizeCategoryLabel(cat.name);
    if (!catNorm) continue;

    if (catNorm === norm) return cat.id;

    const inputTokens = categoryTokens(norm);
    const catTokens = categoryTokens(catNorm);
    const catTokenSet = new Set(catTokens);

    // All input tokens appear in the category name (e.g. "Odalar" or "Odalar Bina")
    if (
      inputTokens.length > 0 &&
      inputTokens.every((t) => catTokenSet.has(t))
    ) {
      const score = inputTokens.length / Math.max(catTokens.length, 1);
      // Prefer fuller matches, but accept a single meaningful token
      const boosted = Math.max(score, 0.7);
      if (!best || boosted > best.score) best = { id: cat.id, score: boosted };
      continue;
    }

    const shorter = norm.length <= catNorm.length ? norm : catNorm;
    const longer = norm.length <= catNorm.length ? catNorm : norm;
    if (longer.includes(shorter) && shorter.length >= 3) {
      const score = shorter.length / longer.length;
      if (score >= minScore && (!best || score > best.score)) {
        best = { id: cat.id, score };
      }
      continue;
    }

    const a = new Set(inputTokens);
    const b = catTokenSet;
    let overlap = 0;
    for (const t of a) if (b.has(t)) overlap++;
    if (overlap === 0) continue;
    // Precision-oriented: how much of the input matched
    const score = overlap / Math.max(a.size, 1);
    if (score >= minScore && (!best || score > best.score)) {
      best = { id: cat.id, score };
    }
  }

  return best && best.score >= minScore ? best.id : null;
}

export function matchCategoryNames(
  names: string[],
  categories: Pick<CategorySummary, "id" | "name">[],
): number[] {
  const ids = new Set<number>();
  for (const name of names) {
    const id = matchCategoryName(name, categories);
    if (id != null) ids.add(id);
  }
  return [...ids];
}

/**
 * Parse a categories cell like "[Ev, Odalar・Bina・Mekân]".
 * Comma / Japanese comma / semicolon / slash separate categories;
 * ・ stays inside a single category name.
 */
export function parseCategoryBracketList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const inner = trimmed.replace(/^\[+|\]+$/g, "").trim();
  if (!inner) return [];
  return inner
    .split(/[,、;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Synonyms / general bracket lists — may use ・ between items. */
export function parseBracketList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const inner = trimmed.replace(/^\[+|\]+$/g, "").trim();
  if (!inner) return [];
  return inner
    .split(/[,\u30FB\u00B7·・、\/;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
