import { db, categoryWordsTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

export async function getCategoryIdsForWord(wordId: number): Promise<number[]> {
  const rows = await db
    .select({ categoryId: categoryWordsTable.categoryId })
    .from(categoryWordsTable)
    .where(eq(categoryWordsTable.wordId, wordId))
    .orderBy(asc(categoryWordsTable.sortOrder), asc(categoryWordsTable.categoryId));
  return rows.map((r) => r.categoryId);
}

export async function setCategoryWords(
  wordId: number,
  categoryIds: number[],
): Promise<void> {
  await db
    .delete(categoryWordsTable)
    .where(eq(categoryWordsTable.wordId, wordId));

  const unique = [...new Set(categoryIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) return;

  await db.insert(categoryWordsTable).values(
    unique.map((categoryId, sortOrder) => ({
      categoryId,
      wordId,
      sortOrder,
    })),
  );
}
