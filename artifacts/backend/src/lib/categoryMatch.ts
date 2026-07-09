/** Strip emoji and normalize separators for fuzzy category matching. */
export function normalizeCategoryLabel(value: string): string {
  return value
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
      "",
    )
    .replace(/\s+/g, "")
    .replace(/[・·]/g, "")
    .toLowerCase();
}

export function matchCategoryName(
  input: string,
  categories: { id: number; name: string }[],
  minScore = 0.55,
): number | null {
  const norm = normalizeCategoryLabel(input);
  if (!norm) return null;

  let best: { id: number; score: number } | null = null;

  for (const cat of categories) {
    const catNorm = normalizeCategoryLabel(cat.name);
    if (!catNorm) continue;

    if (catNorm === norm) return cat.id;

    const shorter = norm.length <= catNorm.length ? norm : catNorm;
    const longer = norm.length <= catNorm.length ? catNorm : norm;

    if (longer.includes(shorter)) {
      const score = shorter.length / longer.length;
      if (score >= minScore && (!best || score > best.score)) {
        best = { id: cat.id, score };
      }
      continue;
    }

    // Token overlap for partial matches (e.g. missing emoji prefix)
    const tokens = (s: string) => s.split(/[^a-z0-9çğıöşü\u3040-\u30ff\u4e00-\u9fff]+/i).filter(Boolean);
    const a = new Set(tokens(norm));
    const b = new Set(tokens(catNorm));
    let overlap = 0;
    for (const t of a) if (b.has(t)) overlap++;
    const score = overlap / Math.max(a.size, b.size, 1);
    if (score >= minScore && (!best || score > best.score)) {
      best = { id: cat.id, score };
    }
  }

  return best?.id ?? null;
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
