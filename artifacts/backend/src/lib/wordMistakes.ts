import {
  db,
  srsCardsTable,
  wordMistakesTable,
  wordsTable,
  type SrsDeckType,
  srsDeckTypes,
} from "@workspace/db";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { ownerOrLegacy } from "./userScope";

export type TroubleDeckEntry = {
  deckType: SrsDeckType;
  mistakeCount: number;
  lastMistakeAt: string;
};

export type TroubleWordRow = {
  wordId: number;
  kanji: string;
  pronunciation: string;
  meaning: string;
  jlptLevel: string | null;
  decks: TroubleDeckEntry[];
  totalMistakes: number;
  lastMistakeAt: string;
};

function parseDeckType(value: string): SrsDeckType | null {
  return (srsDeckTypes as readonly string[]).includes(value)
    ? (value as SrsDeckType)
    : null;
}

export async function recordMistake(wordId: number, deckType: SrsDeckType) {
  const now = new Date();
  await db
    .insert(wordMistakesTable)
    .values({
      wordId,
      deckType,
      mistakeCount: 1,
      lastMistakeAt: now,
    })
    .onConflictDoUpdate({
      target: [wordMistakesTable.wordId, wordMistakesTable.deckType],
      set: {
        mistakeCount: sql`${wordMistakesTable.mistakeCount} + 1`,
        lastMistakeAt: now,
      },
    });
}

export async function recordSuccess(wordId: number, deckType: SrsDeckType) {
  const rows = await db
    .select()
    .from(wordMistakesTable)
    .where(
      and(
        eq(wordMistakesTable.wordId, wordId),
        eq(wordMistakesTable.deckType, deckType),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return;

  if (row.mistakeCount <= 1) {
    await db
      .delete(wordMistakesTable)
      .where(
        and(
          eq(wordMistakesTable.wordId, wordId),
          eq(wordMistakesTable.deckType, deckType),
        ),
      );
    return;
  }

  await db
    .update(wordMistakesTable)
    .set({ mistakeCount: row.mistakeCount - 1 })
    .where(
      and(
        eq(wordMistakesTable.wordId, wordId),
        eq(wordMistakesTable.deckType, deckType),
      ),
    );
}

export async function dismissMistake(
  wordId: number,
  deckType?: SrsDeckType,
  userId?: number,
) {
  if (userId != null) {
    const [word] = await db
      .select({ id: wordsTable.id })
      .from(wordsTable)
      .where(
        and(eq(wordsTable.id, wordId), ownerOrLegacy(userId, wordsTable.userId)),
      )
      .limit(1);
    if (!word) return;
  }

  if (deckType) {
    await db
      .delete(wordMistakesTable)
      .where(
        and(
          eq(wordMistakesTable.wordId, wordId),
          eq(wordMistakesTable.deckType, deckType),
        ),
      );
    return;
  }
  await db.delete(wordMistakesTable).where(eq(wordMistakesTable.wordId, wordId));
}

/** Seed from existing FSRS lapses when table is empty. */
export async function backfillMistakesFromLapses() {
  const existing = await db
    .select({ wordId: wordMistakesTable.wordId })
    .from(wordMistakesTable)
    .limit(1);
  if (existing.length > 0) return;

  const rows = await db
    .select({
      wordId: srsCardsTable.wordId,
      deckType: srsCardsTable.deckType,
      lapses: srsCardsTable.lapses,
      lastReview: srsCardsTable.lastReview,
    })
    .from(srsCardsTable)
    .where(gt(srsCardsTable.lapses, 0));

  if (rows.length === 0) return;

  const now = new Date();
  await db.insert(wordMistakesTable).values(
    rows
      .filter((r) => parseDeckType(r.deckType))
      .map((r) => ({
        wordId: r.wordId,
        deckType: r.deckType,
        mistakeCount: r.lapses,
        lastMistakeAt: r.lastReview ?? now,
      })),
  );
}

export async function listTroubleWords(options: {
  userId: number;
  deck?: SrsDeckType | null;
  minCount?: number;
  limit?: number;
}): Promise<TroubleWordRow[]> {
  await backfillMistakesFromLapses();

  const minCount = options.minCount ?? 1;
  const limit = options.limit ?? 500;

  const conditions = [
    gt(wordMistakesTable.mistakeCount, minCount - 1),
    ownerOrLegacy(options.userId, wordsTable.userId),
  ];
  if (options.deck) {
    conditions.push(eq(wordMistakesTable.deckType, options.deck));
  }

  const rows = await db
    .select({
      mistake: wordMistakesTable,
      word: wordsTable,
    })
    .from(wordMistakesTable)
    .innerJoin(wordsTable, eq(wordMistakesTable.wordId, wordsTable.id))
    .where(and(...conditions))
    .orderBy(
      desc(wordMistakesTable.mistakeCount),
      desc(wordMistakesTable.lastMistakeAt),
    )
    .limit(limit * 4);

  const byWord = new Map<number, TroubleWordRow>();

  for (const { mistake, word } of rows) {
    const deckType = parseDeckType(mistake.deckType);
    if (!deckType) continue;

    let entry = byWord.get(word.id);
    if (!entry) {
      entry = {
        wordId: word.id,
        kanji: word.kanji,
        pronunciation: word.pronunciation,
        meaning: word.meaning,
        jlptLevel: word.jlptLevel,
        decks: [],
        totalMistakes: 0,
        lastMistakeAt: mistake.lastMistakeAt.toISOString(),
      };
      byWord.set(word.id, entry);
    }

    entry.decks.push({
      deckType,
      mistakeCount: mistake.mistakeCount,
      lastMistakeAt: mistake.lastMistakeAt.toISOString(),
    });
    entry.totalMistakes += mistake.mistakeCount;

    if (mistake.lastMistakeAt.getTime() > new Date(entry.lastMistakeAt).getTime()) {
      entry.lastMistakeAt = mistake.lastMistakeAt.toISOString();
    }
  }

  return [...byWord.values()]
    .sort((a, b) => {
      if (b.totalMistakes !== a.totalMistakes) {
        return b.totalMistakes - a.totalMistakes;
      }
      return (
        new Date(b.lastMistakeAt).getTime() - new Date(a.lastMistakeAt).getTime()
      );
    })
    .slice(0, limit);
}

export async function getTroubleWordIds(deckType: SrsDeckType): Promise<number[]> {
  await backfillMistakesFromLapses();

  const rows = await db
    .select({ wordId: wordMistakesTable.wordId })
    .from(wordMistakesTable)
    .where(
      and(
        eq(wordMistakesTable.deckType, deckType),
        gt(wordMistakesTable.mistakeCount, 0),
      ),
    );

  return rows.map((r) => r.wordId);
}

export async function countUniqueTroubleWords(
  userId: number,
  minCount = 1,
): Promise<number> {
  await backfillMistakesFromLapses();

  const rows = await db
    .selectDistinct({ wordId: wordMistakesTable.wordId })
    .from(wordMistakesTable)
    .innerJoin(wordsTable, eq(wordMistakesTable.wordId, wordsTable.id))
    .where(
      and(
        gt(wordMistakesTable.mistakeCount, minCount - 1),
        ownerOrLegacy(userId, wordsTable.userId),
      ),
    );

  return rows.length;
}

export async function getTroubleWordIdsForDeckFilter(
  userId: number,
  deck: SrsDeckType | null,
): Promise<number[]> {
  if (deck) {
    await backfillMistakesFromLapses();
    const rows = await db
      .select({ wordId: wordMistakesTable.wordId })
      .from(wordMistakesTable)
      .innerJoin(wordsTable, eq(wordMistakesTable.wordId, wordsTable.id))
      .where(
        and(
          eq(wordMistakesTable.deckType, deck),
          gt(wordMistakesTable.mistakeCount, 0),
          ownerOrLegacy(userId, wordsTable.userId),
        ),
      );
    return rows.map((r) => r.wordId);
  }

  await backfillMistakesFromLapses();
  const rows = await db
    .selectDistinct({ wordId: wordMistakesTable.wordId })
    .from(wordMistakesTable)
    .innerJoin(wordsTable, eq(wordMistakesTable.wordId, wordsTable.id))
    .where(
      and(
        gt(wordMistakesTable.mistakeCount, 0),
        ownerOrLegacy(userId, wordsTable.userId),
      ),
    );

  return rows.map((r) => r.wordId);
}
