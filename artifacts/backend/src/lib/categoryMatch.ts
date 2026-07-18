/** Strip emoji / diacritics and normalize separators for fuzzy category matching. */
export function normalizeCategoryLabel(value: string): string {
  if (!value) return "";
  let s = value.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
    "",
  );
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
  categories: { id: number; name: string }[],
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

    if (
      inputTokens.length > 0 &&
      inputTokens.every((t) => catTokenSet.has(t))
    ) {
      const score = inputTokens.length / Math.max(catTokens.length, 1);
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
    let overlap = 0;
    for (const t of a) if (catTokenSet.has(t)) overlap++;
    if (overlap === 0) continue;
    const score = overlap / Math.max(a.size, 1);
    if (score >= minScore && (!best || score > best.score)) {
      best = { id: cat.id, score };
    }
  }

  return best && best.score >= minScore ? best.id : null;
}

export function matchCategoryNames(
  names: string[],
  categories: { id: number; name: string }[],
): number[] {
  const ids = new Set<number>();
  for (const name of names) {
    const id = matchCategoryName(name, categories);
    if (id != null) ids.add(id);
  }
  return [...ids];
}
