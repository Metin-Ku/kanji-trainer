import {
  db,
  srsReviewLogTable,
  wordsTable,
  type SrsDeckType,
} from "@workspace/db";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { ownerOnly } from "./userScope";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  return DATE_KEY_RE.test(value);
}

export async function recordSrsReviewLog(
  userId: number,
  wordId: number,
  deckType: SrsDeckType,
  dateKey: string,
  reviewedAt = new Date(),
): Promise<void> {
  if (!isValidDateKey(dateKey)) return;
  await db.insert(srsReviewLogTable).values({
    userId,
    wordId,
    deckType,
    date: dateKey,
    reviewedAt,
  });
}

export async function getStudiedWords(
  userId: number,
  deckType: SrsDeckType,
  from?: string,
  to?: string,
) {
  const filters = [
    eq(srsReviewLogTable.userId, userId),
    eq(srsReviewLogTable.deckType, deckType),
  ];
  if (from && isValidDateKey(from)) {
    filters.push(gte(srsReviewLogTable.date, from));
  }
  if (to && isValidDateKey(to)) {
    filters.push(lte(srsReviewLogTable.date, to));
  }

  const logRows = await db
    .selectDistinct({ wordId: srsReviewLogTable.wordId })
    .from(srsReviewLogTable)
    .where(and(...filters));

  const wordIds = logRows.map((r) => r.wordId);
  if (wordIds.length === 0) return [];

  return db
    .select()
    .from(wordsTable)
    .where(
      and(
        inArray(wordsTable.id, wordIds),
        ownerOnly(userId, wordsTable.userId),
      ),
    )
    .orderBy(wordsTable.kanji);
}
